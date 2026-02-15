import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export const useRoles = (serverId) => {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]); // Members with their roles
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  // Fetch Roles
  useEffect(() => {
    if (!serverId) {
        setRoles([]);
        return;
    }

    const rolesRef = ref(db, `servers/${serverId}/roles`);
    const unsubscribe = onValue(rolesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const list = Object.entries(data).map(([id, val]) => ({
                id,
                ...val,
                position: val.position || 0 // Ensure position exists
            }));
            // Sort by position DESC (highest number at top)
            list.sort((a, b) => b.position - a.position);
            setRoles(list);
        } else {
            setRoles([]);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [serverId]);

  // Fetch Members (and their roles)
  useEffect(() => {
      if (!serverId) {
          setMembers([]);
          return;
      }
      
      // We need to fetch the member list from the server node, 
      // then fetch user details (mostly username) for display.
      const membersRef = ref(db, `servers/${serverId}/members`);
      
      const unsubscribe = onValue(membersRef, async (snapshot) => {
          const data = snapshot.val();
          if (data) {
              const memberIds = Object.keys(data);
              const membersList = [];

              // Fetch details for each member
              // Note: Ideally we observe these, but for a settings list, a one-time fetch on change is okay
              // optimization: create a 'users' listener or cache if list is huge.
              
              for (const uid of memberIds) {
                  const userRef = ref(db, `users/${uid}`);
                  const userSnap = await get(userRef);
                  if (userSnap.exists()) {
                      const userData = userSnap.val();
                      // Get assigned roles for this member in this server
                      // We store member roles at: servers/{serverId}/members/{uid}/roles
                      const defaultRoleData = data[uid] === true ? {} : (data[uid].roles || {});
                      
                      membersList.push({
                          uid,
                          username: userData.username,
                          avatar: userData.avatar || null,
                          status: userData.status || 'offline',
                          roles: defaultRoleData // { roleId: true, ... }
                      });
                  }
              }
              setMembers(membersList);
          } else {
              setMembers([]);
          }
      });

      return () => unsubscribe();
  }, [serverId]);

  const createRole = async (name, color, permissions) => {
      if (!serverId) return;
      const rolesRef = ref(db, `servers/${serverId}/roles`);
      const newRoleRef = push(rolesRef);
      // New roles get highest position (length + 1) to be at top, or similar logic
      await set(newRoleRef, {
          name,
          color,
          permissions,
          position: roles.length > 0 ? (Math.max(...roles.map(r => r.position || 0)) + 1) : 1
      });
  };

  const updateRole = async (roleId, updates) => {
      if (!serverId) return;
      const roleRef = ref(db, `servers/${serverId}/roles/${roleId}`);
      await update(roleRef, updates);
  };

  const deleteRole = async (roleId) => {
      if (!serverId) return;
      const roleRef = ref(db, `servers/${serverId}/roles/${roleId}`);
      await remove(roleRef);
      
      // Cleanup: Remove this role from all members
      // (This is expensive client-side without a cloud function, 
      // but necessary if we want consistency)
      // For now, let's just leave the ID dangling or handle it in UI
  };

  const batchUpdateRoles = async (updatedRoles) => {
      if (!serverId) return;
      const updates = {};
      updatedRoles.forEach(role => {
          updates[`servers/${serverId}/roles/${role.id}/position`] = role.position;
      });
      await update(ref(db), updates);
  };

  const assignRole = async (uid, roleId) => {
      if (!serverId) return;
      const memberRoleRef = ref(db, `servers/${serverId}/members/${uid}/roles/${roleId}`);
      await set(memberRoleRef, true);
  };


  const removeRole = async (uid, roleId) => {
      if (!serverId) return;
      
      const memberRolesRef = ref(db, `servers/${serverId}/members/${uid}/roles`);
      const snapshot = await get(memberRolesRef);
      
      if (snapshot.exists()) {
          const roles = snapshot.val();
          // If this is the last role, set member back to true (legacy/simple membership)
          // otherwise they get deleted entirely because parent becomes empty
          if (Object.keys(roles).length === 1 && roles[roleId]) {
              const memberRef = ref(db, `servers/${serverId}/members/${uid}`);
              await set(memberRef, true);
          } else {
              // Just remove the specific role
              const roleRef = ref(db, `servers/${serverId}/members/${uid}/roles/${roleId}`);
              await remove(roleRef);
          }
      }
  };

  return { 
      roles, 
      members, 
      loading,
      createRole, 
      updateRole, 
      deleteRole, 
      assignRole, 
      removeRole,
      batchUpdateRoles
  };
};
