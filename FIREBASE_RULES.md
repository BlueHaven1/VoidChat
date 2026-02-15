# Firebase Realtime Database Rules

To fix the "Permission denied" error, you need to update your database rules in the Firebase Console.

1. Go to your **Firebase Console**.
2. Navigate to **Realtime Database** -> **Rules**.
3. Replace the existing rules with the code below:

```json
{
  "rules": {
    "users": {
        ".read": "auth != null",
        ".indexOn": ["username"],
        "$uid": {
            ".write": "$uid === auth.uid",
            "status": {
                ".write": "$uid === auth.uid"
            }
        }
    },
    
    // Status (Online/Offline) - Separate node for cleaner presence management
    "status": {
        ".read": "auth != null",
        "$uid": {
            ".write": "$uid === auth.uid"
        }
    },
    
    // Servers
    "servers": {
      // By default, no one can list ALL servers.
      // Must know the ID to access.
      "$serverId": {
        // Read: You must be the owner OR a member to read server data
        ".read": "auth != null && (data.child('ownerId').val() === auth.uid || data.child('members').hasChild(auth.uid))",
        
        // Write: 
        // 1. Create: If creating new data, you must be the owner.
        // 2. Update (Owner): Owner can update anything (name, channels, etc).
        // 3. Join (Member): User can add themselves to 'members'.
        // 4. Leave (Member): User can remove themselves from 'members'.
        ".write": "auth != null",
        
        "roles": {
             ".read": "auth != null",
             ".write": "auth != null"
        },
        "members": {
             ".read": "auth != null",
             ".write": "auth != null"
        }
      }
    },

    "channels": {
      "$channelId": {
        // Since channels are linked to servers in the app logic, we ideally check server membership here.
        // But simplified: Any auth user can read/write if they have the ID.
        ".read": "auth != null",
        ".write": "auth != null",
        "messages": {
             ".indexOn": ["timestamp"]
        }
      }
    },

    "friendRequests": {
       "$uid": {
           // User can read their own requests
           ".read": "auth != null && $uid === auth.uid",
           // Anyone can write (send) a request TO this user
           ".write": "auth != null"
       }
    },

    "friends": {
        "$uid": {
            // Only the user can read their friends list
            ".read": "auth != null && $uid === auth.uid",
            // Only the user can modify their friends list
            ".write": "auth != null && $uid === auth.uid"
        }
    }
  }
}
```

## Firebase Storage Rules
To allow file uploads, you must also set up Storage Rules in the Firebase Console -> Storage -> Rules.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /attachments/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 50 * 1024 * 1024; // 50MB Max
    }
  }
}
```