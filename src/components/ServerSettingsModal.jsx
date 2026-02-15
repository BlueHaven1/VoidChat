import React, { useState } from 'react';
import { X, Plus, Check, Settings, GripVertical } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { useServers } from '../hooks/useServers';
import { useToast } from '../contexts/ToastContext';



const ServerSettingsModal = ({ server, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'roles' | 'members'
    const { updateServer } = useServers();
    const [serverName, setServerName] = useState(server.name);
    const toast = useToast();

    const handleUpdateServer = async (e) => {
        e.preventDefault();
        try {
            await updateServer(server.id, { name: serverName });
            toast.success("Server updated!");
        } catch (error) {
            console.error("Failed to update server", error);
            toast.error("Failed to update server");
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-void-panel/95 backdrop-blur-xl w-[800px] h-[600px] rounded-2xl flex overflow-hidden shadow-2xl border border-white/10">
                {/* Sidebar */}
                <div className="w-1/4 bg-black/20 p-4 flex flex-col gap-2 border-r border-white/5">
                    <h2 className="text-void-text-muted text-xs font-bold uppercase mb-4 px-2">{server.name}</h2>
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === 'overview' ? 'bg-void-accent text-white shadow-lg shadow-void-accent/20' : 'text-void-text-muted hover:bg-white/5 hover:text-void-text'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('roles')}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === 'roles' ? 'bg-void-accent text-white shadow-lg shadow-void-accent/20' : 'text-void-text-muted hover:bg-white/5 hover:text-void-text'}`}
                    >
                        Roles
                    </button>
                    <button 
                        onClick={() => setActiveTab('members')}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === 'members' ? 'bg-void-accent text-white shadow-lg shadow-void-accent/20' : 'text-void-text-muted hover:bg-white/5 hover:text-void-text'}`}
                    >
                        Members
                    </button>
                    <div className="border-t border-white/5 my-2"></div>
                    <button 
                         onClick={onClose}
                         className="text-left px-3 py-2 rounded-lg text-sm text-void-text-muted hover:bg-white/5 hover:text-void-text"
                    >
                        Close
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-void-bg/50 p-8 overflow-y-auto custom-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-xl font-bold text-void-text mb-6">Server Overview</h2>
                            <form onSubmit={handleUpdateServer}>
                                <div className="mb-6">
                                    <label className="block text-void-text-muted text-xs font-bold uppercase mb-2">Server Name</label>
                                    <input 
                                        type="text" 
                                        value={serverName}
                                        onChange={(e) => setServerName(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:border-void-accent transition-colors"
                                    />
                                </div>
                                <div className="flex items-center justify-end">
                                    <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-900/20 transition-all transform active:scale-95">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    )}
                    {activeTab === 'roles' && <RolesTab serverId={server.id} />}
                    {activeTab === 'members' && <MembersTab serverId={server.id} />}
                </div>
                
                <div className="absolute top-4 right-4">
                    <button onClick={onClose} className="p-2 text-void-text-muted hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Color Helpers & Custom Picker ---

const hexToHsv = (hex) => {
    let r = 0, g = 0, b = 0;
    // Handle shorthand #ABC or full #AABBCC
    if (!hex) return { h: 0, s: 0, v: 0 };
    if (hex.startsWith('#')) hex = hex.slice(1);
    
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        return { h: 0, s: 0, v: 0 }; // fallback
    }

    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
    let h = 0, s = 0, v = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    v = Math.round(cmax * 100);
    s = cmax === 0 ? 0 : Math.round((delta / cmax) * 100);

    return { h, s, v };
};

const hsvToHex = (h, s, v) => {
    s /= 100;
    v /= 100;
    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
};

const CustomColorPicker = ({ color, onChange }) => {
    const [hsv, setHsv] = useState(hexToHsv(color));
    const [dragging, setDragging] = useState(null); 
    const svRef = React.useRef(null);
    const hRef = React.useRef(null);
    const hsvRef = React.useRef(hsv); // Keep track of latest hsv for event listeners

    React.useEffect(() => {
        setHsv(hexToHsv(color));
    }, [color]);
    
    React.useEffect(() => {
        hsvRef.current = hsv;
    }, [hsv]);

    const handleUpdate = (newHsv) => {
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };

    const handleSvDown = (e) => {
        setDragging('sv');
        handleSvMove(e, true);
    };
    
    const handleHDown = (e) => {
        setDragging('h');
        handleHMove(e, true);
    };

    const handleSvMove = (e, isDown=false) => {
        if (!svRef.current) return;
        // if not down and not dragging, ignore
        if (!isDown && dragging !== 'sv') return;

        const rect = svRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        
        const s = Math.round((x / rect.width) * 100);
        const v = Math.round(100 - (y / rect.height) * 100);
        
        if (isDown) {
            handleUpdate({ ...hsvRef.current, s, v });
        } else {
             // Defer update to avoid closure stale state if used directly in loop, 
             // but here we call handleUpdate which updates state.
             // We need to use valid H from ref though.
             const currentH = hsvRef.current.h;
             handleUpdate({ h: currentH, s, v });
        }
    };

    const handleHMove = (e, isDown=false) => {
         if (!hRef.current) return;
         if (!isDown && dragging !== 'h') return;

         const rect = hRef.current.getBoundingClientRect();
         const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
         const h = Math.round((x / rect.width) * 360);
         
         if (isDown) {
             handleUpdate({ ...hsvRef.current, h });
         } else {
             const { s, v } = hsvRef.current;
             handleUpdate({ h, s, v });
         }
    };

    React.useEffect(() => {
        const move = (e) => {
            if (dragging === 'sv') handleSvMove(e);
            if (dragging === 'h') handleHMove(e);
        };
        const up = () => setDragging(null);
        
        if (dragging) {
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        }
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [dragging]);

    return (
        <div className="flex flex-col gap-3 p-3 bg-black/40 rounded-xl border border-white/5 mt-2 animate-in fade-in zoom-in-95 duration-200">
            <div 
                ref={svRef}
                className="w-full h-32 rounded-lg relative cursor-crosshair overflow-hidden shadow-inner ring-1 ring-white/10"
                style={{
                    backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                    backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)`
                }}
                onMouseDown={handleSvDown}
            >
                <div 
                    className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: color }}
                />
            </div>

            <div className="flex items-center gap-3">
                <div 
                    ref={hRef}
                    className="flex-1 h-3 rounded-full relative cursor-pointer ring-1 ring-white/10"
                    style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                    onMouseDown={handleHDown}
                >
                    <div 
                        className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none top-0 transform -translate-x-1/2"
                        style={{ left: `${(hsv.h / 360) * 100}%` }}
                    />
                </div>
                <div className="w-8 h-8 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: color }}></div>
            </div>
            
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5 relative group focus-within:border-void-accent/50 transition-colors">
                <span className="text-xs text-void-text-muted font-bold select-none">#</span>
                <input 
                    type="text" 
                    value={color.replace('#', '')} 
                    onChange={(e) => {
                         const val = '#' + e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                         onChange(val);
                    }}
                    className="bg-transparent text-sm text-white outline-none w-full font-mono uppercase" 
                    maxLength={6}
                />
            </div>
        </div>
    );
};


const RolesTab = ({ serverId }) => {
    const { roles, createRole, updateRole, deleteRole, batchUpdateRoles } = useRoles(serverId);
    const [selectedRole, setSelectedRole] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isClosingConfirm, setIsClosingConfirm] = useState(false);
    
    // Drag State
    const [draggedRoleIndex, setDraggedRoleIndex] = useState(null);
    const [localRoles, setLocalRoles] = useState([]);

    // Check if order changed
    const isOrderChanged = React.useMemo(() => {
        if (roles.length !== localRoles.length) return false;
        return roles.some((r, i) => r.id !== localRoles[i].id);
    }, [roles, localRoles]);

    // Sync roles to local state for DnD
    React.useEffect(() => {
        if (draggedRoleIndex !== null) return;
        // Only sync if order is NOT changed locally (to preserve unsaved changes)
        // OR if lengths differ (force sync for adding/removing items from DB side)
        if (!isOrderChanged || roles.length !== localRoles.length) {
             setLocalRoles(roles);
        }
    }, [roles, draggedRoleIndex, isOrderChanged]); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Local state for editing
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#99AAB5');
    const [editPermissions, setEditPermissions] = useState({});
    const [showCustomColor, setShowCustomColor] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [isClosingPopup, setIsClosingPopup] = useState(false);

    // Effect to check for changes
    React.useEffect(() => {
        let detailsChanged = false;
        if (selectedRole) {
            const isNameChanged = editName !== selectedRole.name;
            const isColorChanged = editColor !== selectedRole.color;
            
            // Deep compare permissions
            const currentPerms = selectedRole.permissions || {};
            const allKeys = new Set([...Object.keys(currentPerms), ...Object.keys(editPermissions)]);
            let isPermsChanged = false;
            for (let key of allKeys) {
                if (!!currentPerms[key] !== !!editPermissions[key]) {
                    isPermsChanged = true;
                    break;
                }
            }
            detailsChanged = isNameChanged || isColorChanged || isPermsChanged;
        }

        setHasUnsavedChanges(detailsChanged || isOrderChanged);
    }, [editName, editColor, editPermissions, selectedRole, isOrderChanged]);

    // Handle popup animation logic
    React.useEffect(() => {
        if (hasUnsavedChanges) {
            setShowSavePopup(true);
            setIsClosingPopup(false);
        } else {
            if (showSavePopup) {
                setIsClosingPopup(true);
                const timer = setTimeout(() => {
                    setShowSavePopup(false);
                    setIsClosingPopup(false);
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [hasUnsavedChanges]);

    const handleCreate = async () => {
        await createRole('New Role', '#99AAB5', {});
    };

    const handleSelectRole = (role) => {
        if (hasUnsavedChanges) {
             const confirmSwitch = window.confirm("You have unsaved changes. Discard them?");
             if (!confirmSwitch) return;
        }
        
        setSelectedRole(role);
        setEditName(role.name);
        setEditColor(role.color);
        setEditPermissions(role.permissions || {});
        setShowDeleteConfirm(false);
        setIsClosingConfirm(false);
        setShowCustomColor(false);
    };

    const handleReset = () => {
        // Reset role details
        if (selectedRole) {
            setEditName(selectedRole.name);
            setEditColor(selectedRole.color);
            setEditPermissions(selectedRole.permissions || {});
            setShowCustomColor(false);
        }
        // Reset order
        setLocalRoles(roles);
    };

    const handleSave = async () => {
        try {
            const promises = [];

            // Save role details if selected
            if (selectedRole) {
                promises.push(updateRole(selectedRole.id, {
                    name: editName,
                    color: editColor,
                    permissions: editPermissions
                }));
                
                setSelectedRole(prev => ({ ...prev, name: editName, color: editColor, permissions: editPermissions }));
            }

            // Save role order if changed
            if (isOrderChanged) {
                const count = localRoles.length;
                const updates = localRoles.map((role, i) => ({
                    ...role,
                    position: count - i 
                }));
                promises.push(batchUpdateRoles(updates));
            }

            await Promise.all(promises);
            setHasUnsavedChanges(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteClick = () => {
        if (!selectedRole) return;
        setShowDeleteConfirm(true);
        setIsClosingConfirm(false);
    };

    const handleCloseConfirm = () => {
        setIsClosingConfirm(true);
        setTimeout(() => {
            setShowDeleteConfirm(false);
            setIsClosingConfirm(false);
        }, 200); // Wait for animation
    };

    const confirmDelete = async () => {
        if (!selectedRole) return;
        await deleteRole(selectedRole.id);
        setSelectedRole(null);
        handleCloseConfirm();
    };

    // Drag Handlers
    const handleDragStart = (e, index) => {
        setDraggedRoleIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // e.dataTransfer.setDragImage(e.target, 0, 0); // Optional: customize ghost image
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        
        if (draggedRoleIndex === null || draggedRoleIndex === index) return;

        // Reorder list locally
        const newRoles = [...localRoles];
        const draggedRole = newRoles[draggedRoleIndex];
        
        // Remove from old index
        newRoles.splice(draggedRoleIndex, 1);
        // Insert at new index
        newRoles.splice(index, 0, draggedRole);
        
        setLocalRoles(newRoles);
        setDraggedRoleIndex(index);
    };

    const handleDragEnd = async () => {
        setDraggedRoleIndex(null);
        // We don't save immediately now.
        // The useEffect checking isOrderChanged will trigger setHasUnsavedChanges(true).
    };

    const togglePermission = (permId) => {
        setEditPermissions(prev => ({
            ...prev,
            [permId]: !prev[permId]
        }));
    };
    
    const PERMISSIONS_LIST = [
        { id: 'ADMIN', label: 'Administrator' },
        { id: 'MANAGE_CHANNELS', label: 'Manage Channels' },
        { id: 'KICK_MEMBERS', label: 'Kick Members' },
        { id: 'HOIST', label: 'Display role members separately from online members' },
        { id: 'MENTIONABLE', label: 'Allow anyone to @mention this role' }
    ];

    const COLORS = [
        '#99AAB5', '#992D22', '#E74C3C', // Grey, Dark Red, Red
        '#E67E22', '#F1C40F', // Orange, Yellow
        '#2ECC71', '#11806A', // Green, Dark Green
        '#3498DB', '#206694', // Blue, Dark Blue
        '#9B59B6', '#71368A', // Purple, Dark Purple
        '#E91E63', '#AD1457', // Pink, Dark Pink
    ];

    
    return (
        <div className="flex h-full gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md ${isClosingConfirm ? 'animate-out fade-out' : 'animate-in fade-in'} duration-200`}>
                    <div className={`bg-void-panel border border-white/10 p-6 rounded-xl shadow-2xl w-full max-w-sm m-4 z-[101] duration-200 ${isClosingConfirm ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95 slide-in-from-bottom-2'}`}>
                        <h4 className="text-void-text font-bold text-lg mb-2">Delete Role?</h4>
                        <p className="text-void-text-muted text-sm mb-6">
                            Are you sure you want to delete <span className="text-white font-medium" style={{ color: editColor }}>{editName}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={handleCloseConfirm}
                                className="px-4 py-2 rounded-lg text-void-text-muted hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-red-900/20 transition-all duration-200"
                            >
                                Delete Role
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role List */}
            <div className="w-1/3 flex flex-col gap-2 border-r border-white/5 pr-4">
                 <div className="flex items-center justify-between mb-2">
                    <h3 className="text-void-text font-bold text-sm uppercase">Roles</h3>
                    <button onClick={handleCreate} className="bg-void-accent/20 p-1 rounded hover:bg-void-accent/40 text-void-accent transition-colors"><Plus size={16} /></button>
                 </div>
                 <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                     {localRoles.map((role, index) => (
                         <div 
                            key={role.id} 
                            className={`group relative flex items-center pr-1 transition-transform duration-200 ${draggedRoleIndex === index ? 'opacity-50 scale-95' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Grip Indicator (Shows on Hover) */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-void-text-muted transition-opacity">
                                <GripVertical size={14} />
                            </div>

                             <button
                                onClick={() => handleSelectRole(role)}
                                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${selectedRole?.id === role.id ? 'bg-void-accent text-white shadow-lg shadow-void-accent/20' : 'text-void-text-muted hover:bg-white/5 hover:text-void-text'}`}
                             >
                                 <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: role.color }}></div>
                                 <span className="truncate">{role.name}</span>
                             </button>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Role Editor */}
            <div className="flex-1 pl-2 overflow-y-auto custom-scrollbar pr-2">
                {selectedRole ? (
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="text-xs font-bold text-void-text-muted uppercase mb-2 block">Role Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:border-void-accent transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-void-text-muted uppercase mb-2 block">Role Color</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setShowCustomColor(!showCustomColor)}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-105 p-0.5 ${showCustomColor ? 'border-white' : 'border-transparent'}`}
                                    title="Custom Color"
                                >
                                     <div className="w-full h-full rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#E91E63_0deg,#9C27B0_55deg,#3F51B5_112deg,#2196F3_160deg,#00BCD4_205deg,#4CAF50_250deg,#FFEB3B_300deg,#FF9800_360deg)]"></div>
                                </button>
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setEditColor(c); setShowCustomColor(false); }}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${editColor === c && !showCustomColor ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            {showCustomColor && (
                                <CustomColorPicker color={editColor} onChange={setEditColor} />
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-void-text-muted uppercase mb-2 block">Permissions</label>
                            <div className="flex flex-col gap-2">
                                {PERMISSIONS_LIST.map(perm => (
                                    <div key={perm.id} className="flex items-center justify-between bg-black/20 border border-white/5 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                        <span className="text-void-text text-sm font-medium">{perm.label}</span>
                                        <button 
                                            onClick={() => togglePermission(perm.id)}
                                            className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${editPermissions[perm.id] ? 'bg-void-accent' : 'bg-white/10'}`}
                                        >
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${editPermissions[perm.id] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-white/10 pb-20">
                            <button onClick={handleDeleteClick} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Delete Role</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-void-text-muted gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <Settings size={32} className="opacity-50" />
                        </div>
                        <p>Select a role to edit permissions</p>
                    </div>
                )}
            </div>
            
            {/* Unsaved Changes Popup */}
            {showSavePopup && (
                <div className={`absolute bottom-4 left-4 right-4 bg-void-panel border border-void-accent/20 rounded-xl p-3 flex items-center justify-between shadow-2xl z-50 ${isClosingPopup ? 'animate-popout' : 'animate-popup'}`}>
                    <span className="text-white font-medium text-sm px-2">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleReset}
                            className="text-void-text-muted hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:underline transition-all"
                        >
                            Reset
                        </button>
                        <button 
                            onClick={handleSave}
                            className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-5 py-2 rounded-lg shadow-lg shadow-green-900/20 transition-all transform active:scale-95"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MembersTab = ({ serverId }) => {
    const { members, roles, assignRole, removeRole } = useRoles(serverId);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const hasRole = (member, roleId) => {
        return member.roles && member.roles[roleId];
    };

    const toggleRole = async (member, roleId) => {
        if (hasRole(member, roleId)) {
            await removeRole(member.uid, roleId);
        } else {
            await assignRole(member.uid, roleId);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-1 min-h-[400px] pb-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <h3 className="text-void-text font-bold text-sm uppercase mb-2">Members</h3>
             <div className="flex flex-col gap-2">
                 {members.map(member => (
                     <div key={member.uid} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-void-panel flex items-center justify-center text-void-text font-bold text-lg shadow-lg border border-white/5">
                                 {member.avatar ? <img src={member.avatar} alt="" className="w-10 h-10 rounded-full object-cover"/> : member.username[0]}
                             </div>
                             <div>
                                 <div className="text-void-text font-medium flex items-center gap-2">
                                     {member.username} 
                                     {/* Display badges for roles */}
                                     {roles.filter(r => hasRole(member, r.id)).map(r => (
                                         <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium text-white shadow-sm" style={{ backgroundColor: r.color }}>{r.name}</span>
                                     ))}
                                 </div>
                                 <div className="text-void-text-muted text-xs">Member since {new Date().toLocaleDateString()}</div>
                             </div>
                         </div>
                         
                         {/* Role Assigner Dropdown (Click version) */}
                         <div className="relative">
                             <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setOpenDropdownId(openDropdownId === member.uid ? null : member.uid); 
                                }} 
                                className={`text-void-text-muted hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors ${openDropdownId === member.uid ? 'text-white bg-white/10' : ''}`}
                             >
                                <Plus size={18} />
                             </button>
                             
                             {openDropdownId === member.uid && (
                                 <div className="absolute right-0 top-full mt-2 bg-void-panel/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 w-56 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                     <div className="text-[10px] font-bold text-void-text-muted uppercase mb-2 px-2 py-1">Add Role</div>
                                     <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {roles.length > 0 ? roles.map(role => (
                                            <button 
                                                key={role.id}
                                                onClick={(e) => { e.stopPropagation(); toggleRole(member, role.id); }}
                                                className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-void-text-muted hover:bg-white/10 hover:text-white rounded-lg mb-1 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: role.color }}></div>
                                                    <span>{role.name}</span>
                                                </div>
                                                {hasRole(member, role.id) && <Check size={14} className="text-green-400" />}
                                            </button>
                                        )) : <div className="text-void-text-muted text-xs p-4 text-center italic">No roles created yet</div>}
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

export default ServerSettingsModal;
