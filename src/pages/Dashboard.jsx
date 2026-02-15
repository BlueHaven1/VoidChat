import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../hooks/useServers';
import { useFriends } from '../hooks/useFriends';
import { useChat } from '../hooks/useChat';
import { usePresence } from '../hooks/usePresence';
import { useChannels } from '../hooks/useChannels';
import { useToast } from '../contexts/ToastContext';
import { storage } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Modal from '../components/Modal';
import ServerSettingsModal from '../components/ServerSettingsModal';
import { LogOut, Hash, Plus, Trash2, Edit2, MoreVertical, ChevronDown, MessageSquare, Bell, Search, Mic, Headphones, Settings, X, Check, UserPlus, User, Circle, Link, Compass, FileText, AlertTriangle, Image as ImageIcon, Menu, Users, Download, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { servers, createServer, deleteServer, updateServer, joinServer, leaveServer } = useServers();
  const toast = useToast();
  const { friends, requests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, loading: friendsLoading } = useFriends();
  const { userStatuses, allUsers, setStatus } = usePresence();
  
  // State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [friendsTab, setFriendsTab] = useState('online'); // 'online' | 'all' | 'pending' | 'add'
  
  // Derived State
  const selectedServer = servers.find(s => s.id === selectedServerId);
  const { channels, createChannel } = useChannels(selectedServerId);

    // Auto-select first channel
    useEffect(() => {
        if (selectedServerId && channels.length > 0) {
            if (!selectedChannelId || !channels.find(c => c.id === selectedChannelId)) {
                setSelectedChannelId(channels[0].id);
            }
        } else if (!selectedServerId) {
            setSelectedChannelId(null);
        }
    }, [selectedServerId, channels, selectedChannelId]);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  
  // UI State
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [serverNameInput, setServerNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileWarning, setShowFileWarning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [friendUsernameInput, setFriendUsernameInput] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [channelType, setChannelType] = useState('text');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Update State
  const [updateStatus, setUpdateStatus] = useState(null); // null | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  const [updateInfo, setUpdateInfo] = useState({});
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const isElectron = typeof window !== 'undefined' && window.electronUpdater;

  const messagesEndRef = useRef(null);

  // Auto-updater listener
  useEffect(() => {
    if (!isElectron) return;
    window.electronUpdater.getAppVersion().then(v => setAppVersion(v));
    const cleanup = window.electronUpdater.onUpdateStatus((data) => {
      setUpdateStatus(data.status);
      setUpdateInfo(data);
      if (data.status === 'available') setShowUpdateModal(true);
    });
    return cleanup;
  }, []);

  const handleCheckForUpdates = async () => {
    if (!isElectron) {
      toast.error('Updates are only available in the desktop app.');
      return;
    }
    setUpdateStatus('checking');
    const result = await window.electronUpdater.checkForUpdates();
    if (!result.success) {
      toast.error(result.message || 'Failed to check for updates.');
      setUpdateStatus('error');
    }
  };

  const handleInstallUpdate = () => {
    if (!isElectron) return;
    window.electronUpdater.installUpdate();
  };

  // Derived State (cont)
  
    // DM Logic
  const getDmChannelId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  const currentChatId = selectedServer 
      ? (selectedChannelId || selectedServer.id) // Fallback to server ID for legacy
      : (selectedFriend ? getDmChannelId(currentUser.uid, selectedFriend.uid) : null);

  const { messages, sendMessage, deleteMessage, typingUsers, handleTyping } = useChat(currentChatId);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Close mobile menus on resize
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth >= 768) {
            setMobileMenuOpen(false);
            setMobileMembersOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch (error) { console.error("Failed to log out", error); }
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!serverNameInput.trim()) return;
    try {
      const newId = await createServer(serverNameInput);
      setSelectedServerId(newId);
      setShowCreateModal(false);
      setServerNameInput('');
    } catch (error) {
      console.error("Failed to create server", error);
    }
  };

  const handleDeleteServer = async () => {
    if (!selectedServer) return;
    try {
      await deleteServer(selectedServer.id);
      setSelectedServerId(null);
      setShowDeleteModal(false);
      setServerMenuOpen(false);
    } catch (error) {
      console.error("Failed to delete server", error);
    }
  };

  const handleLeaveServer = async () => {
    if (!selectedServer) return;
    try {
      await leaveServer(selectedServer.id);
      setSelectedServerId(null);
      setShowLeaveModal(false);
      setServerMenuOpen(false);
      toast.success("Left server successfully");
    } catch (error) {
       console.error("Failed to leave server", error);
       toast.error("Failed to leave server");
    }
  };
    
  const handleUpdateServer = async (e) => {
    e.preventDefault();
    if (!selectedServer || !serverNameInput.trim()) return;
    try {
      await updateServer(selectedServer.id, { name: serverNameInput });
      setShowEditModal(false);
      setServerMenuOpen(false);
      setServerNameInput('');
    } catch (error) {
      console.error("Failed to update server", error);
    }
  };

  const handleJoinServer = async (e) => {
      e.preventDefault();
      if (!inviteCodeInput.trim()) return;
      try {
          await joinServer(inviteCodeInput.trim());
          setShowJoinModal(false);
          setInviteCodeInput('');
          toast.success("Joined server successfully!");
      } catch (err) {
          toast.error("Failed to join server: " + err.message);
      }
  };
  
  const copyInviteLink = () => {
      if (!selectedServer) return;
      navigator.clipboard.writeText(selectedServer.id);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleSendFriendRequest = async (e) => {
      e.preventDefault();
      try {
          await sendFriendRequest(friendUsernameInput);
          setShowAddFriendModal(false);
          setFriendUsernameInput('');
          toast.success("Friend request sent!");
      } catch (err) {
          toast.error("Error: " + err.message);
      }
  };

  const triggerFileSelect = () => {
      fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (50MB Limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
          toast.error("File is too big! Max size is 50MB.");
          e.target.value = null;
          return;
      }

      const ext = file.name.split('.').pop().toLowerCase();
      if (['exe', 'bat', 'cmd', 'sh', 'vbs'].includes(ext)) {
          setSelectedFile(file);
          setShowFileWarning(true);
      } else {
          setSelectedFile(file);
      }
      e.target.value = null;
  };

  const cancelFile = () => {
      setSelectedFile(null);
      setShowFileWarning(false);
  };

  const confirmDangerousFile = () => {
      setShowFileWarning(false);
  };

  const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!msgInput.trim() && !selectedFile) return;
      if (isUploading) return;

      let attachment = null;

      try {
          if (selectedFile) {
              setIsUploading(true);
              const fileRef = storageRef(storage, `attachments/${Date.now()}_${selectedFile.name}`);
              const snapshot = await uploadBytes(fileRef, selectedFile);
              const url = await getDownloadURL(snapshot.ref);
              
              let type = 'file';
              const mime = selectedFile.type;
              // Simple extension check for 'type' property if mime is generic
              const ext = selectedFile.name.split('.').pop().toLowerCase();

              if (mime.startsWith('image/')) type = 'image';
              else if (mime.startsWith('video/')) type = 'video';
              else if (['exe', 'bat', 'cmd', 'sh', 'vbs'].includes(ext)) type = 'dangerous';

              attachment = {
                  url,
                  type,
                  name: selectedFile.name,
                  size: selectedFile.size
              };
          }

          await sendMessage(msgInput, attachment);
          setMsgInput('');
          setSelectedFile(null);
      } catch (error) {
          console.error("Error sending message:", error);
          toast.error("Failed to send message.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleInputChange = (e) => {
      setMsgInput(e.target.value);
      handleTyping();
  };

  const openCreateModal = () => { setServerNameInput(''); setShowCreateModal(true); };
  const openEditModal = () => { 
      if (!selectedServer) return; 
      setServerNameInput(selectedServer.name); 
      setShowEditModal(true); 
  };
  
  const openServerSettings = () => {
    setShowServerSettings(true);
    setServerMenuOpen(false);
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!serverNameInput.trim()) return;
    try {
        await createChannel(serverNameInput, channelType);
        setShowCreateChannelModal(false);
        setServerNameInput('');
        setChannelType('text');
    } catch (error) {
        console.error("Failed to create channel", error);
    }
  };

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = (e) => {
        // Close context menu if clicked outside
        if (contextMenu.visible && !e.target.closest('.context-menu')) {
             setContextMenu({ ...contextMenu, visible: false });
        }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Handle clicking outside of popups
  useEffect(() => {
    const handleClickOutside = (event) => {
        // Server Menu
        const serverMenuTrigger = document.getElementById('server-menu-trigger');
        if (serverMenuOpen && serverMenuTrigger && !serverMenuTrigger.contains(event.target)) {
            setServerMenuOpen(false);
        }

        // Status Menu
        const statusMenuTrigger = document.getElementById('status-menu-trigger');
        const statusDropdown = document.getElementById('status-dropdown');
        if (statusMenuOpen && statusMenuTrigger && !statusMenuTrigger.contains(event.target) && (!statusDropdown || !statusDropdown.contains(event.target))) {
            setStatusMenuOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [serverMenuOpen, statusMenuOpen]);

  const handleContextMenu = (e) => {
      e.preventDefault();
      if (!selectedServer || selectedServer.ownerId !== currentUser.uid) return;
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleServerSelect = (id) => {
      setSelectedServerId(id);
      setSelectedFriend(null);
      setFriendsTab('none'); // Exit friends view
  };
  
  const handleHomeSelect = () => {
      setSelectedServerId(null);
      setSelectedFriend(null);
      setFriendsTab('online'); // Go to friends home
  };
  
  const handleFriendSelect = (friend) => {
      setSelectedFriend(friend);
      setSelectedServerId(null);
      setFriendsTab('none'); // Show chat, not friends home
  };

  return (
    <div className="flex h-screen w-full bg-void-bg text-void-text font-sans overflow-hidden p-2 sm:p-4 gap-3 md:gap-4 relative">
      
      {/* 1. SERVER DOCK */}
      <div className={`flex-col items-center py-4 space-y-4 w-[72px] glass rounded-2xl h-full border border-white/5 ${mobileMenuOpen ? 'fixed left-2 top-2 bottom-2 z-50 flex shadow-2xl bg-[#1e1e24]' : 'hidden sm:flex'}`}>
        <div 
          onClick={handleHomeSelect} 
          className="relative group flex items-center justify-center w-full cursor-pointer"
        >
             <div className={`absolute left-0 bg-void-accent rounded-r-full transition-all duration-300 ${!selectedServer && !selectedFriend ? 'h-10 w-1' : 'h-2 w-1 -translate-x-full group-hover:translate-x-0'}`}></div>
            <div className={`w-12 h-12 rounded-[20px] transition-all duration-300 flex items-center justify-center text-white shadow-lg ${!selectedServer && !selectedFriend ? 'bg-gradient-to-br from-void-accent to-blue-600 rounded-[14px]' : 'bg-void-element hover:bg-void-accent hover:rounded-[14px]'}`}>
              <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=voidchat" alt="Home" className="w-7 h-7" />
            </div>
        </div>
        <div className="w-10 h-[2px] bg-white/5 rounded-full" />
        <div className="flex-1 w-full flex flex-col items-center space-y-3 overflow-y-auto no-scrollbar py-2">
            {servers.map((server) => (
            <div key={server.id} onClick={() => handleServerSelect(server.id)} className="group relative flex items-center justify-center w-full cursor-pointer">
                <div className={`absolute left-0 bg-white rounded-r-full transition-all duration-300 ${selectedServer?.id === server.id ? 'h-10 w-1' : 'h-2 w-1 -translate-x-full group-hover:translate-x-0'}`}></div>
                <div className={`w-12 h-12 rounded-[24px] transition-all duration-300 flex items-center justify-center overflow-hidden border border-transparent shadow-md ${selectedServer?.id === server.id ? 'bg-void-accent rounded-[16px] text-white border-white/10' : 'bg-void-element hover:bg-void-accent hover:rounded-[16px] hover:text-white'}`} title={server.name}>
                    {server.icon ? <img src={server.icon} alt={server.name} className="w-full h-full object-cover" /> : <span className="font-bold text-sm">{server.name.substring(0, 2).toUpperCase()}</span>}
                </div>
            </div>
            ))}
            <div onClick={openCreateModal} className="w-12 h-12 bg-void-element/50 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500 rounded-[24px] hover:rounded-[16px] transition-all duration-300 cursor-pointer flex items-center justify-center text-green-500 hover:text-green-400 group shadow-sm">
                <Plus className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" />
            </div>
            <div onClick={() => { setInviteCodeInput(''); setShowJoinModal(true); }} className="w-12 h-12 bg-void-element/50 hover:bg-void-accent/20 border border-void-accent/30 hover:border-void-accent rounded-[24px] hover:rounded-[16px] transition-all duration-300 cursor-pointer flex items-center justify-center text-void-accent group shadow-sm">
                <Compass className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
            </div>
        </div>
      </div>

      {/* 2. SECONDARY SIDEBAR (Channels or Friends) */}
      <div className={`w-[280px] glass rounded-2xl flex-col border border-white/5 relative ${mobileMenuOpen ? 'fixed left-[88px] top-2 bottom-2 z-50 flex shadow-2xl bg-[#1e1e24]' : 'hidden md:flex'}`}>
        {/* Header */}
        <div 
            id="server-menu-trigger"
            className="relative h-16 flex items-center justify-between px-5 font-bold hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5"
            onClick={() => selectedServer && setServerMenuOpen(!serverMenuOpen)}
        >
            <span className="truncate text-lg font-bold tracking-tight">{selectedServer ? selectedServer.name : "Messages"}</span>
            {selectedServer && <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${serverMenuOpen ? 'rotate-180' : ''}`} />}
            
            {/* Server Settings Dropdown */}
            {serverMenuOpen && selectedServer && (
                <div className="absolute top-16 left-5 w-60 z-50 bg-[#1e1e24]/95 backdrop-blur-xl rounded-xl p-1.5 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div className="relative mb-1">
                        <button onClick={(e) => { e.stopPropagation(); copyInviteLink(); }} className="w-full text-center px-3 py-2 text-sm text-void-accent hover:bg-void-accent/10 rounded-lg flex items-center justify-center gap-2 transition-colors">
                            Copy Invite Code <Link className="w-4 h-4" />
                        </button>
                        {inviteCopied && (
                            <div className="absolute inset-x-0 -bottom-5 text-center pointer-events-none">
                                <span className="text-[10px] bg-black/80 text-void-accent px-2 py-0.5 rounded-full border border-void-accent/20 animate-in fade-in slide-in-from-top-1 shadow-lg backdrop-blur-sm">
                                    Copied!
                                </span>
                            </div>
                        )}
                     </div>
                    {(selectedServer.ownerId === currentUser.uid) && (
                        <>
                             <button onClick={(e) => { e.stopPropagation(); openServerSettings(); }} className="w-full text-center px-3 py-2 text-sm text-void-text hover:bg-void-accent rounded-lg flex items-center justify-center gap-2 transition-colors"> Edit Server <Settings className="w-4 h-4 opacity-70" /></button>
                             <div className="h-[1px] bg-white/5 my-1.5"></div>
                             <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} className="w-full text-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2 transition-colors"> Delete Server <Trash2 className="w-4 h-4 opacity-70" /></button>
                        </>
                    )}
                     {selectedServer.ownerId !== currentUser.uid && (
                        <>
                            <div className="h-[1px] bg-white/5 my-1.5"></div>
                            <button onClick={(e) => { e.stopPropagation(); setShowLeaveModal(true); }} className="w-full text-center px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2 transition-colors"> Leave Server <LogOut className="w-4 h-4 opacity-70" /></button>
                        </>
                     )}
                </div>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar" onContextMenu={handleContextMenu}>
            {selectedServer ? (
                 <>
                    <div className="flex items-center justify-between px-2 pt-2 pb-1 text-void-text-muted/80 group">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider">Channels</span>
                        {selectedServer.ownerId === currentUser.uid && <button onClick={() => { setServerNameInput(''); setChannelType('text'); setShowCreateChannelModal(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"><Plus className="w-3 h-3" /></button>}
                    </div>
                    
                    {channels.map(channel => (
                        <div 
                            key={channel.id}
                            onClick={() => setSelectedChannelId(channel.id)}
                            className={`px-3 py-2 rounded-lg cursor-pointer flex items-center group transition-all mb-0.5 ${selectedChannelId === channel.id ? 'bg-void-accent/10 text-white border border-void-accent/20' : 'text-void-text-muted hover:bg-white/5 hover:text-void-text border border-transparent'}`}
                        >
                            {channel.type === 'voice' ? <Mic className={`w-4 h-4 mr-2 ${selectedChannelId === channel.id ? 'text-void-accent' : 'text-void-text-muted group-hover:text-void-text'}`} /> : <Hash className={`w-4 h-4 mr-2 ${selectedChannelId === channel.id ? 'text-void-accent' : 'text-void-text-muted group-hover:text-void-text'}`} />}
                            <span className="font-medium">{channel.name}</span>
                        </div>
                    ))}
                    {channels.length === 0 && <div className="text-center text-xs text-void-text-muted italic py-4">No channels.</div>}
                 </>
            ) : (
                <>
                     {/* Friends Button (Replaces "Add Friend" modal trigger) */}
                     <div 
                        onClick={() => { setSelectedFriend(null); setFriendsTab('online'); }}
                        className={`px-3 py-2.5 mb-4 rounded-xl flex items-center cursor-pointer transition-all text-sm font-medium shadow-lg ${!selectedFriend && friendsTab !== 'none' ? 'bg-void-accent text-white shadow-void-accent/20' : 'bg-void-element hover:bg-white/5 text-void-text-muted hover:text-white'}`}
                     >
                        <User className="w-5 h-5 mr-3" />
                        Friends
                     </div>

                     <div className="flex items-center justify-between px-2 pb-2 text-void-text-muted/80">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider">Direct Messages</span>
                    </div>

                    {/* Pending Requests Indicator */}
                    {requests.length > 0 && (
                        <div 
                           onClick={() => { setSelectedFriend(null); setFriendsTab('pending'); }}
                           className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-void-element/50 hover:bg-void-element cursor-pointer text-xs font-bold text-void-text-muted hover:text-white transition-colors border border-white/5 group"
                        >
                            <span className="flex items-center"><Bell className="w-3 h-3 mr-2 group-hover:text-void-accent transition-colors" /> {requests.length} Pending Requests</span>
                            <div className="w-2 h-2 rounded-full bg-void-accent animate-pulse"></div>
                        </div>
                    )}
                    {/* Friends (DM List) */}
                    {friends.map(friend => (
                        <div key={friend.uid} onClick={() => handleFriendSelect(friend)} className={`px-3 py-2 rounded-lg cursor-pointer flex items-center mb-1 group transition-colors ${selectedFriend?.uid === friend.uid ? 'bg-white/10 text-white' : 'text-void-text-muted hover:bg-white/5'}`}>
                            <div className="relative w-8 h-8 mr-3">
                                <div className="w-8 h-8 rounded-full bg-void-accent flex items-center justify-center text-white font-bold text-xs ring-2 ring-transparent group-hover:ring-void-accent/50 overflow-hidden">
                                    {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : friend.username?.[0]?.toUpperCase()}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#121217] ${
                                    !userStatuses[friend.uid] || userStatuses[friend.uid]?.state === 'online' ? 'bg-green-500' :
                                    userStatuses[friend.uid]?.state === 'idle' ? 'bg-yellow-500' :
                                    userStatuses[friend.uid]?.state === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
                                }`}></div>
                            </div>
                            <span className={`text-sm font-medium transition-colors ${selectedFriend?.uid === friend.uid ? 'text-white' : 'text-void-text group-hover:text-white'}`}>{friend.username}</span>
                        </div>
                    ))}
                    {friends.length === 0 && <div className="text-center text-xs text-void-text-muted italic py-4">No friends yet. Add some!</div>}
                </>
            )}
        </div>
        
        {/* User Footer */}
        <div className="h-16 bg-black/20 backdrop-blur-md px-3 flex items-center justify-between border-t border-white/5 relative">
             <div 
                id="status-menu-trigger"
                className="flex items-center hover:bg-white/5 p-1.5 rounded-lg cursor-pointer transition-colors max-w-[70%]"
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
             >
                 <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-void-accent to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                        {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover rounded-full" /> : (currentUser?.displayName || currentUser?.email || "U").substring(0, 2).toUpperCase()}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#121217] ${
                        !userStatuses[currentUser?.uid] || userStatuses[currentUser?.uid]?.state === 'online' ? 'bg-green-500' :
                        userStatuses[currentUser?.uid]?.state === 'idle' ? 'bg-yellow-500' :
                        userStatuses[currentUser?.uid]?.state === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                 </div>
                 <div className="ml-2.5 overflow-hidden">
                     <div className="text-sm font-bold text-white truncate">{currentUser?.displayName || "User"}</div>
                     <div className="text-[10px] text-void-text-muted truncate">#{currentUser?.uid?.substring(0,4)}</div>
                 </div>
             </div>
             
             {/* Status Menu */}
             {statusMenuOpen && (
                 <div id="status-dropdown" className="absolute bottom-16 left-3 w-56 bg-[#18191c] rounded-xl p-2 shadow-2xl border border-white/10 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                     <div className="px-2 py-1 text-[10px] font-bold text-void-text-muted uppercase tracking-wider mb-1">Set Status</div>
                     {[
                         { id: 'online', label: 'Online', color: 'bg-green-500' },
                         { id: 'idle', label: 'Idle', color: 'bg-yellow-500' },
                         { id: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
                         { id: 'offline', label: 'Invisible', color: 'bg-gray-500' },
                     ].map(status => (
                         <button 
                            key={status.id}
                            onMouseDown={(e) => { e.stopPropagation(); }}
                            onClick={() => { setStatus(status.id); setStatusMenuOpen(false); }}
                            className="w-full flex items-center px-2 py-2 text-sm text-void-text hover:bg-void-accent hover:text-white rounded-lg transition-colors group"
                         >
                             <div className={`w-2.5 h-2.5 rounded-full ${status.color} mr-3 group-hover:ring-2 ring-white/20`}></div>
                             {status.label}
                             {userStatuses[currentUser?.uid]?.state === status.id && <Check className="w-3 h-3 ml-auto opacity-70" />}
                         </button>
                     ))}
                 </div>
             )}

             <div className="flex items-center space-x-1">
                 {isElectron && (
                   <button 
                     onClick={() => { 
                       if (updateStatus === 'downloaded' || updateStatus === 'available') {
                         setShowUpdateModal(true);
                       } else {
                         setShowUpdateModal(true);
                         handleCheckForUpdates();
                       }
                     }} 
                     className={`p-2 rounded-lg transition-colors relative ${
                       updateStatus === 'downloaded' ? 'text-green-400 hover:bg-green-400/10 animate-pulse' :
                       updateStatus === 'checking' || updateStatus === 'downloading' ? 'text-void-accent cursor-wait' :
                       'text-void-text-muted hover:text-void-accent hover:bg-void-accent/10'
                     }`}
                     title={updateStatus === 'downloaded' ? 'Update ready — click to view' : 'Check for updates'}
                   >
                     {updateStatus === 'checking' || updateStatus === 'downloading' ? (
                       <RefreshCw className="w-4 h-4 animate-spin" />
                     ) : updateStatus === 'downloaded' ? (
                       <Download className="w-4 h-4" />
                     ) : (
                       <Download className="w-4 h-4" />
                     )}
                     {updateStatus === 'available' || updateStatus === 'downloaded' ? (
                       <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500"></div>
                     ) : null}
                   </button>
                 )}
                 <button onClick={handleLogout} className="p-2 text-void-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><LogOut className="w-4 h-4" /></button>
             </div>
        </div>
      </div>

      {/* 3. MAIN CHAT AREA */}
      <div className="flex-1 glass rounded-2xl flex flex-col min-w-0 border border-white/5 relative overflow-hidden">
         {/* Header */}
         <div className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center min-w-0">
                <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden mr-3 p-1.5 -ml-2 text-void-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {selectedServer ? <Hash className="w-6 h-6 text-void-text-muted mr-3 hidden md:block" /> : (selectedFriend ? <User className="w-6 h-6 text-void-text-muted mr-3 hidden md:block" /> : (requests.length > 0 ? <Bell className="w-6 h-6 text-void-text-muted mr-3 hidden md:block" /> : <Hash className="w-6 h-6 text-void-text-muted mr-3 hidden md:block" />))}
                
                <h3 className="font-bold text-white mr-4 text-lg truncate">
                    {selectedServer ? (selectedChannel?.name || "channels") : (selectedFriend ? selectedFriend.username : "Home")}
                </h3>
                
                {(selectedServer || selectedFriend) && <span className="text-sm text-void-text-muted/60 hidden sm:block font-medium truncate">
                    {selectedServer ? (selectedChannel?.topic || "Start chatting!") : "Direct Message"}
                </span>}
            </div>

            {selectedServer && (
                <button 
                    onClick={() => setMobileMembersOpen(true)}
                    className="lg:hidden p-2 text-void-text-muted hover:text-void-accent hover:bg-void-accent/10 rounded-lg transition-colors"
                >
                    <Users className="w-6 h-6" />
                </button>
            )}
         </div>

         {/* Messages */}
         <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
             {(selectedServer || selectedFriend) ? (
                 <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar flex flex-col min-h-0">
                    {messages.length === 0 && (
                        <div className="mt-12 mb-8 p-8 rounded-2xl bg-gradient-to-br from-void-accent/10 to-transparent border border-void-accent/20">
                   {selectedFriend ? (
                       <>
                           <div className="w-16 h-16 rounded-[24px] bg-void-accent text-white flex items-center justify-center mb-4 shadow-lg shadow-void-accent/20">
                               <User className="w-8 h-8" />
                           </div>
                           <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                               Chat with {selectedFriend.username}
                           </h1>
                           <p className="text-void-text-muted text-lg">
                               This is the beginning of your direct message history with @{selectedFriend.username}.
                           </p>
                       </>
                   ) : (
                       <>
                           <div className="w-16 h-16 rounded-[24px] bg-void-accent text-white flex items-center justify-center mb-4 shadow-lg shadow-void-accent/20">
                               <Hash className="w-8 h-8" />
                           </div>
                           <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                               Welcome to #{selectedServer.name}!
                           </h1>
                           <p className="text-void-text-muted text-lg">
                               This is the start of the channel.
                           </p>
                       </>
                   )}
                        </div>
                    )}
                    
                    {/* Message List */}
                    <div className="flex-1 flex flex-col justify-end">
                        {messages.map((msg, idx) => {
                            // Check if consecutive message from same user (simplified)
                            const isConsecutive = idx > 0 && messages[idx-1].senderId === msg.senderId;
                            
                            // Permission Checks
                            const isOwner = selectedServer?.ownerId === currentUser.uid;
                            const isSender = msg.senderId === currentUser.uid;
                            
                            // Determine if Admin (simplified: if role has permissions, or if user has any role for now)
                            // Ideally, we check permissions: 'ADMIN' or 'MANAGE_CHANNELS'
                            let isAdmin = false;
                            if (selectedServer && selectedServer.members && selectedServer.members[currentUser.uid]) {
                                const memberRoles = selectedServer.members[currentUser.uid].roles || {};
                                const roles = selectedServer.roles || {};
                                
                                isAdmin = Object.keys(memberRoles).some(roleId => {
                                    const role = roles[roleId];
                                    return role && role.permissions && (role.permissions.ADMIN || role.permissions.MANAGE_CHANNELS);
                                });
                            }

                            const canDelete = isSender || (selectedServer && (isOwner || isAdmin));

                            return (
                                <div key={msg.id} className={`group flex ${isConsecutive ? 'mt-0.5' : 'mt-4'} relative pr-10`}>
                                    {!isConsecutive ? (
                                        <div className="w-10 h-10 rounded-full bg-void-element mr-4 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                            {msg.senderPhoto ? <img src={msg.senderPhoto} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-void-text-muted">{msg.senderName?.[0]}</div>}
                                        </div>
                                    ) : <div className="w-14"></div> }
                                    
                                    <div className="flex-1 min-w-0">
                                        {!isConsecutive && (
                                            <div className="flex items-center mb-1">
                                                <span className="font-bold text-white mr-2 hover:underline cursor-pointer">{msg.senderName}</span>
                                                <span className="text-[10px] text-void-text-muted">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        )}
                                        
                                        {msg.attachment && (
                                            <div className="mb-2 max-w-sm">
                                                {msg.attachment.type === 'image' ? (
                                                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                                                        <img src={msg.attachment.url} alt="Attachment" className="max-w-full max-h-80 object-contain" />
                                                    </a>
                                                ) : msg.attachment.type === 'video' ? (
                                                     <video controls src={msg.attachment.url} className="max-w-full rounded-xl border border-white/5" />
                                                ) : (
                                                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-lg border border-white/10 bg-void-element hover:bg-void-accent/5 transition-colors group/file">
                                                        <div className="mr-3">
                                                            {msg.attachment.type === 'dangerous' ? <AlertTriangle className="w-8 h-8 text-yellow-500" /> : <FileText className="w-8 h-8 text-void-accent" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm font-bold truncate ${msg.attachment.type === 'dangerous' ? 'text-yellow-500' : 'text-void-accent group-hover/file:underline'}`}>{msg.attachment.name}</div>
                                                            <div className="text-xs text-void-text-muted">{(msg.attachment.size / 1024).toFixed(1)} KB</div>
                                                            {msg.attachment.type === 'dangerous' && <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-0.5">Potentially Dangerous</div>}
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {msg.text && <p className="text-void-text leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                    </div>

                                    {/* Message Actions */}
                                    {canDelete && (
                                        <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-void-bg border border-white/5 rounded-lg shadow-sm">
                                             <button 
                                                onClick={() => deleteMessage(msg.id)}
                                                className="p-1.5 text-void-text-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                                title="Delete Message"
                                             >
                                                <Trash2 className="w-4 h-4" />
                                             </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && (
                            <div className="flex items-center mt-2 ml-14 animate-pulse">
                                <div className="flex space-x-1 mr-2">
                                    <div className="w-2 h-2 bg-void-text-muted rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-2 h-2 bg-void-text-muted rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-void-text-muted rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                                <span className="text-xs font-bold text-void-text-muted">
                                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                </span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                 </div>
             ) : (
                /* 4. FRIENDS HOME VIEW */
                <div className="flex flex-col h-full bg-void-bg/50">
                     {/* Friends Header */}
                     <div className="h-16 flex items-center px-6 border-b border-white/5 bg-white/[0.02]">
                         <div className="flex items-center space-x-2 mr-6 text-void-text-muted">
                             <User className="w-5 h-5 mr-2" />
                             <span className="font-bold text-white">Friends</span>
                         </div>
                         <div className="h-6 w-[1px] bg-white/10 mx-4"></div>
                         <div className="flex items-center space-x-4">
                             <button onClick={() => setFriendsTab('online')} className={`px-2 py-1 rounded hover:bg-white/5 hover:text-void-text transition-colors font-medium text-sm ${friendsTab === 'online' ? 'text-white bg-white/10' : 'text-void-text-muted'}`}>Online</button>
                             <button onClick={() => setFriendsTab('all')} className={`px-2 py-1 rounded hover:bg-white/5 hover:text-void-text transition-colors font-medium text-sm ${friendsTab === 'all' ? 'text-white bg-white/10' : 'text-void-text-muted'}`}>All</button>
                             <button onClick={() => setFriendsTab('pending')} className={`px-2 py-1 rounded hover:bg-white/5 hover:text-void-text transition-colors font-medium text-sm relative ${friendsTab === 'pending' ? 'text-white bg-white/10' : 'text-void-text-muted'}`}>
                                 Pending
                                 {requests.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1 py-[1px] rounded-full inline-flex items-center justify-center align-middle">{requests.length}</span>}
                             </button>
                             <button onClick={() => setFriendsTab('add')} className={`px-2 py-1 rounded transition-colors font-bold text-sm ${friendsTab === 'add' ? 'text-green-400 bg-transparent' : 'text-green-500 bg-green-500/10 hover:bg-green-500/20'}`}>Add Friend</button>
                         </div>
                     </div>

                     {/* Friends Content */}
                     <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                         {friendsTab === 'online' && (
                             <div>
                                 <h2 className="text-xs font-extrabold text-void-text-muted uppercase mb-4 tracking-wider">Online Friends — {friends.filter(f => ['online', 'idle', 'dnd'].includes(userStatuses[f.uid]?.state)).length}</h2>
                                 {friends.filter(f => ['online', 'idle', 'dnd'].includes(userStatuses[f.uid]?.state)).map(friend => (
                                     <div key={friend.uid} onClick={() => handleFriendSelect(friend)} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer border-t border-white/5 hover:border-transparent transition-all">
                                         <div className="flex items-center">
                                             <div className="relative mr-3">
                                                 <div className="w-9 h-9 rounded-full bg-void-accent text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
                                                     {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover"/> : friend.username?.[0]?.toUpperCase()}
                                                 </div>
                                                 <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#15151a] ${
                                                     userStatuses[friend.uid]?.state === 'dnd' ? 'bg-red-500' :
                                                     userStatuses[friend.uid]?.state === 'idle' ? 'bg-yellow-500' : 'bg-green-500'
                                                 }`}></div>
                                             </div>
                                             <div>
                                                 <div className="font-bold text-white text-sm group-hover:text-void-accent transition-colors flex items-center">
                                                     {friend.username}
                                                     <span className="ml-2 text-[10px] text-void-text-muted hidden group-hover:inline-block bg-black/40 px-1.5 rounded">#{friend.uid.substring(0,4)}</span>
                                                 </div>
                                                 <div className="text-xs text-void-text-muted">{userStatuses[friend.uid]?.customStatus || userStatuses[friend.uid]?.state || "Online"}</div>
                                             </div>
                                         </div>
                                         <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button className="w-8 h-8 rounded-full bg-void-element hover:bg-void-text-muted hover:text-black flex items-center justify-center transition-colors" title="Message"><MessageSquare className="w-4 h-4" /></button>
                                             <button className="w-8 h-8 rounded-full bg-void-element hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors" title="More"><MoreVertical className="w-4 h-4" /></button>
                                         </div>
                                     </div>
                                 ))}
                                 {friends.filter(f => ['online', 'idle', 'dnd'].includes(userStatuses[f.uid]?.state)).length === 0 && (
                                     <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                         <div className="bg-void-element p-4 rounded-full mb-4 grayscale"><User className="w-8 h-8 text-void-text-muted" /></div>
                                         <p className="text-void-text-muted text-sm">No one is around to play with Cipher.</p>
                                     </div>
                                 )}
                             </div>
                         )}

                         {friendsTab === 'all' && (
                             <div>
                                 <div className="mb-4 relative">
                                     <Search className="w-4 h-4 text-void-text-muted absolute left-3 top-3" />
                                     <input type="text" placeholder="Search" className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-void-accent/50 transition-colors" />
                                 </div>
                                 <h2 className="text-xs font-extrabold text-void-text-muted uppercase mb-4 tracking-wider">All Friends — {friends.length}</h2>
                                 {friends.map(friend => (
                                     <div key={friend.uid} onClick={() => handleFriendSelect(friend)} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer border-t border-white/5 hover:border-transparent transition-all">
                                         <div className="flex items-center">
                                             <div className="relative mr-3">
                                                 <div className="w-9 h-9 rounded-full bg-void-element text-void-text-muted flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden group-hover:bg-void-accent group-hover:text-white transition-colors">
                                                     {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover"/> : friend.username?.[0]?.toUpperCase()}
                                                 </div>
                                                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#15151a] ${
                                                     !userStatuses[friend.uid] || !userStatuses[friend.uid].state || userStatuses[friend.uid].state === 'offline' ? 'bg-gray-500' : 
                                                     (userStatuses[friend.uid].state === 'dnd' ? 'bg-red-500' :
                                                     userStatuses[friend.uid].state === 'idle' ? 'bg-yellow-500' : 'bg-green-500')
                                                 }`}></div>
                                             </div>
                                             <div>
                                                 <div className="font-bold text-white text-sm group-hover:text-void-accent transition-colors flex items-center">
                                                     {friend.username}
                                                     <span className="ml-2 text-[10px] text-void-text-muted hidden group-hover:inline-block bg-black/40 px-1.5 rounded">#{friend.uid.substring(0,4)}</span>
                                                 </div>
                                                 <div className="text-xs text-void-text-muted">{!userStatuses[friend.uid] || !userStatuses[friend.uid].state ? 'Offline' : userStatuses[friend.uid].state}</div>
                                             </div>
                                         </div>
                                         <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button className="w-8 h-8 rounded-full bg-void-element hover:bg-void-text-muted hover:text-black flex items-center justify-center transition-colors" title="Message"><MessageSquare className="w-4 h-4" /></button>
                                             <button className="w-8 h-8 rounded-full bg-void-element hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors" title="More"><MoreVertical className="w-4 h-4" /></button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}

                         {friendsTab === 'pending' && (
                             <div>
                                 <h2 className="text-xs font-extrabold text-void-text-muted uppercase mb-4 tracking-wider">Pending — {requests.length}</h2>
                                 {requests.length === 0 ? (
                                     <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                         <div className="bg-void-element p-4 rounded-full mb-4 grayscale"><Bell className="w-8 h-8 text-void-text-muted" /></div>
                                         <p className="text-void-text-muted text-sm">There are no pending friend requests. Here's a Cipher for now.</p>
                                     </div>
                                 ) : (
                                     requests.map(req => (
                                         <div key={req.uid} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer border-t border-white/5 hover:border-transparent transition-all">
                                             <div className="flex items-center">
                                                 <div className="w-9 h-9 rounded-full bg-void-element text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden mr-3">
                                                     {req.photoURL ? <img src={req.photoURL} className="w-full h-full object-cover"/> : req.username?.[0]?.toUpperCase()}
                                                 </div>
                                                 <div>
                                                     <div className="font-bold text-white text-sm">{req.username} <span className="text-void-text-muted font-normal ml-1">incoming request</span></div>
                                                 </div>
                                             </div>
                                             <div className="flex space-x-2">
                                                 <button onClick={() => acceptFriendRequest(req.uid)} className="w-8 h-8 rounded-full bg-void-element hover:bg-green-500 hover:text-white flex items-center justify-center transition-colors" title="Accept"><Check className="w-4 h-4" /></button>
                                                 <button onClick={() => rejectFriendRequest(req.uid)} className="w-8 h-8 rounded-full bg-void-element hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors" title="Ignore"><X className="w-4 h-4" /></button>
                                             </div>
                                         </div>
                                     ))
                                 )}
                             </div>
                         )}

                         {friendsTab === 'add' && (
                             <div className="max-w-xl">
                                 <h2 className="text-lg font-bold text-white mb-2 uppercase">Add Friend</h2>
                                 <p className="text-void-text-muted text-sm mb-6">You can add a friend with their VoidChat Username. It's cAsE sEnSiTiVe!</p>
                                 
                                 <form onSubmit={handleSendFriendRequest} className={`relative rounded-xl border p-2 flex items-center transition-all ${friendUsernameInput ? 'border-green-500/50 shadow-[0_0_0_2px_rgba(34,197,94,0.1)] bg-black/40' : 'border-black bg-black/20 focus-within:border-void-accent'}`}>
                                     <input 
                                         type="text" 
                                         value={friendUsernameInput} 
                                         onChange={(e) => setFriendUsernameInput(e.target.value)} 
                                         className="flex-1 bg-transparent border-none focus:outline-none text-white px-4 py-2 placeholder-void-text-muted/50" 
                                         placeholder="Enter a Username#0000"
                                         autoFocus
                                     />
                                     <button 
                                         type="submit" 
                                         disabled={!friendUsernameInput}
                                         className="px-6 py-2 bg-void-accent hover:bg-void-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                     >
                                         Send Friend Request
                                     </button>
                                 </form>

                                 <div className="mt-12 opacity-50 text-center">
                                     <div className="w-48 h-48 bg-void-element/30 mx-auto rounded-full flex items-center justify-center mb-4">
                                         <Compass className="w-24 h-24 text-void-text-muted/20" />
                                     </div>
                                     <p className="text-void-text-muted text-sm">Cipher is waiting on friends. Maybe you can add some?</p>
                                 </div>
                             </div>
                         )}
                     </div>
                </div>
             )}

         </div>

         {/* Input */}
         {(selectedServer || selectedFriend) && (
            <div className="p-5 pb-6 bg-gradient-to-t from-black/20 to-transparent">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                />
                
                {/* File Preview */}
                {selectedFile && (
                    <div className="flex items-center p-3 mb-2 bg-void-element rounded-xl border border-white/5 animate-in slide-in-from-bottom-2">
                        <div className="p-2 bg-white/5 rounded-lg mr-3">
                             {selectedFile.type.startsWith('image/') ? (
                                 <ImageIcon className="w-6 h-6 text-void-accent" />
                             ) : (
                                 <FileText className="w-6 h-6 text-void-accent" />
                             )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate">{selectedFile.name}</div>
                            <div className="text-xs text-void-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button onClick={cancelFile} className="p-1 hover:bg-white/10 rounded-full text-void-text-muted hover:text-red-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
                
                <form onSubmit={handleSendMessage} className="glass-input rounded-full p-1.5 pl-4 flex items-center shadow-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                    <button type="button" onClick={triggerFileSelect} className="w-8 h-8 rounded-full bg-void-text-muted/20 hover:bg-void-text-muted/40 text-void-text-muted hover:text-white flex items-center justify-center transition-all mr-3">
                        <Plus className="w-5 h-5" />
                    </button>
                    <input 
                        type="text" 
                        value={msgInput}
                        onChange={handleInputChange}
                        placeholder={`Message ${selectedServer ? '#' + (selectedChannel?.name || 'chat') : '@' + selectedFriend.username}`}
                        className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-void-text-muted/50 py-2"
                    />
                    <div className="flex items-center pr-2 space-x-1">
                        <button type="submit" disabled={isUploading} className={`p-2 transition-colors ${isUploading ? 'text-void-text-muted cursor-wait' : 'text-void-text-muted hover:text-void-accent'}`}>
                            {isUploading ? <div className="w-5 h-5 border-2 border-void-text-muted border-t-white rounded-full animate-spin"></div> : <MessageSquare className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
         )}
      </div>

    {/* --- Member Sidebar --- */}
    {selectedServer && (
        <div className={`w-64 glass rounded-2xl flex-col p-4 border border-white/5 overflow-y-auto custom-scrollbar ${mobileMembersOpen ? 'fixed right-2 top-2 bottom-2 z-50 flex shadow-2xl bg-[#1e1e24]' : 'hidden lg:flex'}`}>
            {(() => {
                // 1. Helpers & Definitions
                const serverRoles = selectedServer.roles || {};
                const memberDataMap = selectedServer.members || {};
                
                // 2. Filter All Users to just this server's members
                const serverMembers = allUsers.filter(u => memberDataMap[u.uid]);

                // 3. Separate Online vs Offline
                const onlineMembers = [];
                const offlineMembers = [];
                
                serverMembers.forEach(u => {
                    const status = userStatuses[u.uid]?.state;
                    if (!status || status === 'offline') {
                        offlineMembers.push(u);
                    } else {
                        onlineMembers.push(u);
                    }
                });

                // 4. Group Online Members by Hoisted Role
                // We use a Map to preserve insertion order if we were sorting, but here we'll build an object 
                // and then convert to array.
                const groupedMembers = {}; // { roleId: { role, members: [] } }
                const nonHoistedMembers = [];

                onlineMembers.forEach(u => {
                    const mData = memberDataMap[u.uid];
                    const userRoles = (typeof mData === 'object' && mData.roles) ? Object.keys(mData.roles) : [];
                    
                    // Find highest positioning HOISTED role
                    let highestHoistedRole = null;
                    let maxPos = -1;

                    for (const rId of userRoles) {
                        const r = serverRoles[rId];
                        if (r && r.permissions && r.permissions.HOIST) {
                            const p = r.position || 0;
                            if (p > maxPos) {
                                maxPos = p;
                                highestHoistedRole = { id: rId, ...r };
                            }
                        }
                    }

                    if (highestHoistedRole) {
                        if (!groupedMembers[highestHoistedRole.id]) {
                            groupedMembers[highestHoistedRole.id] = { role: highestHoistedRole, members: [] };
                        }
                        groupedMembers[highestHoistedRole.id].members.push(u);
                    } else {
                        nonHoistedMembers.push(u);
                    }
                });

                // Sort groups by role position Descending
                const sortedGroups = Object.values(groupedMembers).sort((a, b) => {
                    return (b.role.position || 0) - (a.role.position || 0);
                });

                // 5. Render Function helper
                const renderUserRow = (user) => {
                     // Determine user's highest role color
                     let userId = user.uid;
                     let userRoleIds = (memberDataMap[userId] && typeof memberDataMap[userId] === 'object' && memberDataMap[userId].roles) 
                        ? Object.keys(memberDataMap[userId].roles) 
                        : [];
                     
                     // Find the role with highest position for this user
                     let highestRole = null;
                     let maxPos = -1;
                     
                     userRoleIds.forEach(rid => {
                         const r = serverRoles[rid];
                         if (r) {
                             const p = r.position || 0;
                             if (p > maxPos) {
                                 maxPos = p;
                                 highestRole = r;
                             }
                         }
                     });
                     
                     const nameColor = highestRole ? highestRole.color : null;
                    
                    return (
                        <div key={user.uid} className="group flex items-center px-2 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all">
                            <div className="relative mr-3">
                                <div className="w-9 h-9 rounded-full bg-void-accent text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
                                    {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : user.username?.[0]?.toUpperCase()}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#15151a] ${
                                    userStatuses[user.uid]?.state === 'dnd' ? 'bg-red-500' :
                                    userStatuses[user.uid]?.state === 'idle' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                            </div>
                            <div>
                                <div className="font-bold text-sm group-hover:opacity-80 transition-opacity" style={{ color: nameColor || 'var(--color-void-text)' }}>
                                    {user.username}
                                </div>
                                {userStatuses[user.uid]?.customStatus && <div className="text-[10px] text-void-text-muted">{userStatuses[user.uid].customStatus}</div>}
                            </div>
                        </div>
                    );
                };

                return (
                    <>
                        {/* Display Hoisted Groups */}
                        {sortedGroups.map(group => (
                             <div key={group.role.id} className="mb-6">
                                <h3 className="text-xs font-extrabold text-void-text-muted uppercase mb-2 tracking-wider px-2 truncate flex items-center gap-2">
                                    <span style={{ color: group.role.color }}>{group.role.name}</span>
                                    <span>— {group.members.length}</span>
                                </h3>
                                {group.members.map(u => renderUserRow(u))}
                             </div>
                        ))}

                        {/* Online Category - Remainder */}
                        {nonHoistedMembers.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-extrabold text-void-text-muted uppercase mb-2 tracking-wider px-2">
                                    Online — {nonHoistedMembers.length}
                                </h3>
                                {nonHoistedMembers.map(user => renderUserRow(user))}
                            </div>
                        )}

                        {/* Offline Category */}
                        {offlineMembers.length > 0 && (
                        <div>
                            <h3 className="text-xs font-extrabold text-void-text-muted uppercase mb-2 tracking-wider px-2">
                                Offline — {offlineMembers.length}
                            </h3>
                            {offlineMembers.map(user => (
                                <div key={user.uid} className="group flex items-center px-2 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all opacity-50 hover:opacity-100">
                                    <div className="relative mr-3">
                                        <div className="w-9 h-9 rounded-full bg-void-element text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden grayscale">
                                            {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : user.username?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 rounded-full border-2 border-[#15151a]"></div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-void-text-muted text-sm group-hover:text-void-text transition-colors">{user.username}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}
                    </>
                );
            })()}
      </div>
    )}

      {/* --- Modals --- */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create a Server">
          <form onSubmit={handleCreateServer} className="mt-4">
               <div className="flex justify-center mb-8"><div className="w-24 h-24 rounded-2xl border-2 border-dashed border-void-text-muted/40 hover:border-void-accent hover:bg-void-accent/5 flex flex-col items-center justify-center text-void-text-muted hover:text-void-accent cursor-pointer transition-all"><Plus className="w-8 h-8 mb-1" /><span className="text-[10px] font-bold uppercase">Upload Icon</span></div></div>
              <input type="text" value={serverNameInput} onChange={(e) => setServerNameInput(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-void-accent transition-colors mb-6" placeholder="My Awesome Server" required autoFocus />
              <button type="submit" className="w-full bg-void-accent hover:bg-void-accent-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-void-accent/25 transition-all">Create Server</button>
          </form>
      </Modal>
      
      {/* Context Menu (Moved to root level to avoid clipping) */}
        {contextMenu.visible && (
            <div 
                className="fixed bg-[#1e1e24] border border-white/10 shadow-xl rounded-lg py-1 z-[9999] w-48"
                style={{ top: contextMenu.y, left: contextMenu.x, transform: 'translateX(-50%)' }}
            >
                <div className="px-3 py-2 text-xs font-bold text-void-text-muted uppercase tracking-wider">Create Channel</div>
                <button 
                    className="w-full text-left px-3 py-2 text-sm text-void-text hover:bg-void-accent hover:text-white flex items-center transition-colors"
                    onClick={() => { setChannelType('text'); setServerNameInput(''); setShowCreateChannelModal(true); }}
                >
                    <Hash className="w-4 h-4 mr-2" /> Text Channel
                </button>
                <button 
                    className="w-full text-left px-3 py-2 text-sm text-void-text hover:bg-void-accent hover:text-white flex items-center transition-colors"
                    onClick={() => { setChannelType('voice'); setServerNameInput(''); setShowCreateChannelModal(true); }}
                >
                    <Mic className="w-4 h-4 mr-2" /> Voice Channel
                </button>
            </div>
        )}

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join a Server">
          <form onSubmit={handleJoinServer} className="mt-4">
             <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-void-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 text-void-accent"><Compass className="w-8 h-8" /></div>
                 <p className="text-void-text-muted text-sm">Enter a Server ID below to join an existing server.</p>
             </div>
             <input type="text" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-void-accent transition-colors mb-6" placeholder="Paste Server ID here..." required autoFocus />
             <button type="submit" className="w-full bg-void-accent hover:bg-void-accent-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-void-accent/25 transition-all">Join Server</button>
         </form>
      </Modal>

      <Modal isOpen={showCreateChannelModal} onClose={() => setShowCreateChannelModal(false)} title="Create Channel">
        <form onSubmit={handleCreateChannel} className="mt-4">
            <div className="mb-4">
                <label className="text-xs font-bold text-void-text-muted uppercase mb-2 block">Channel Type</label>
                <div className="flex space-x-2 mb-4">
                    <button type="button" onClick={() => setChannelType('text')} className={`flex-1 p-3 rounded-lg border flex items-center justify-center transition-all ${channelType === 'text' ? 'bg-void-accent/10 border-void-accent text-void-accent' : 'bg-black/20 border-white/5 text-void-text-muted hover:bg-white/5'}`}>
                        <Hash className="w-4 h-4 mr-2" /> <span className="text-sm font-bold">Text</span>
                    </button>
                    <button type="button" onClick={() => setChannelType('voice')} className={`flex-1 p-3 rounded-lg border flex items-center justify-center transition-all ${channelType === 'voice' ? 'bg-void-accent/10 border-void-accent text-void-accent' : 'bg-black/20 border-white/5 text-void-text-muted hover:bg-white/5'}`}>
                        <Mic className="w-4 h-4 mr-2" /> <span className="text-sm font-bold">Voice</span>
                    </button>
                </div>

                <label className="text-xs font-bold text-void-text-muted uppercase mb-2 block">Channel Name</label>
                <input type="text" value={serverNameInput} onChange={(e) => setServerNameInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-void-accent transition-colors" placeholder="new-channel" required autoFocus />
            </div>
            <button type="submit" className="w-full bg-void-accent hover:bg-void-accent-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-void-accent/25 transition-all">Create Channel</button>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Overview">
        <form onSubmit={handleUpdateServer} className="mt-4"> <input type="text" value={serverNameInput} onChange={(e) => setServerNameInput(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-void-accent transition-colors mb-6" required /><button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-600/20 transition-all">Save Changes</button></form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Server">
          <div className="mt-4 text-center">
              <p className="text-void-text-muted mb-6 px-4">Are you sure you want to delete <span className="font-bold text-white">{selectedServer?.name}</span>?</p>
              <div className="flex space-x-3"><button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors">Cancel</button><button onClick={handleDeleteServer} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all">Delete Server</button></div>
          </div>
      </Modal>

      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Leave Server">
          <div className="mt-4 text-center">
              <p className="text-void-text-muted mb-6 px-4">Are you sure you want to leave <span className="font-bold text-white">{selectedServer?.name}</span>?</p>
              <div className="flex space-x-3"><button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors">Cancel</button><button onClick={handleLeaveServer} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all">Leave Server</button></div>
          </div>
      </Modal>
      
      {/* Dangerous File Warning Modal */}
      {showFileWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-[#1e1e24] border border-red-500/30 w-full max-w-md p-6 rounded-2xl shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-2">
                   <div className="flex flex-col items-center text-center">
                       <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 ring-1 ring-red-500/20">
                           <AlertTriangle className="w-8 h-8" />
                       </div>
                       <h3 className="text-xl font-bold text-white mb-2">Potentially Dangerous File</h3>
                       <p className="text-void-text-muted mb-6">
                           You are about to upload <span className="text-white font-mono bg-white/5 px-1 rounded">{selectedFile?.name}</span>. 
                           Executable files can harm other users' computers. Are you sure?
                       </p>
                       
                       <div className="flex w-full gap-3">
                           <button 
                               onClick={cancelFile} 
                               className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                           >
                               Cancel
                           </button>
                           <button 
                               onClick={confirmDangerousFile} 
                               className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-900/20 transition-all"
                           >
                               Upload Anyway
                           </button>
                       </div>
                   </div>
               </div>
          </div>
      )}

      {/* Friend Request Modal */}
      <Modal isOpen={showAddFriendModal} onClose={() => setShowAddFriendModal(false)} title="Add Friend">
         <form onSubmit={handleSendFriendRequest} className="mt-4">
             <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-void-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 text-void-accent"><UserPlus className="w-8 h-8" /></div>
                 <p className="text-void-text-muted text-sm">Enter a username to send a friend request.</p>
             </div>
             <input type="text" value={friendUsernameInput} onChange={(e) => setFriendUsernameInput(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-void-accent transition-colors mb-6" placeholder="Username#0000 (Case Sensitive)" required autoFocus />
             <button type="submit" className="w-full bg-void-accent hover:bg-void-accent-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-void-accent/25 transition-all">Send Friend Request</button>
         </form>
      </Modal>

      {showServerSettings && selectedServer && (
          <ServerSettingsModal 
            server={selectedServer} 
            onClose={() => setShowServerSettings(false)} 
          />
      )}

      {/* Update Modal */}
      <Modal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} title="Software Update">
          <div className="mt-4 text-center">
              {updateStatus === 'checking' && (
                  <div className="flex flex-col items-center py-6">
                      <RefreshCw className="w-12 h-12 text-void-accent animate-spin mb-4" />
                      <p className="text-void-text-muted">Checking for updates...</p>
                  </div>
              )}
              {updateStatus === 'available' && (
                  <div className="flex flex-col items-center py-4">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-400 ring-1 ring-green-500/20">
                          <Download className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Update Available</h3>
                      <p className="text-void-text-muted mb-1">A new version <span className="text-white font-mono bg-white/5 px-1.5 rounded">v{updateInfo.version}</span> is available.</p>
                      <p className="text-void-text-muted text-sm mb-6">Current version: v{appVersion}</p>
                      <div className="flex w-full gap-3">
                          <button onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors">Later</button>
                          <button onClick={() => { window.electronUpdater.downloadUpdate(); }} className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-900/20 transition-all">Download Update</button>
                      </div>
                  </div>
              )}
              {updateStatus === 'downloading' && (
                  <div className="flex flex-col items-center py-6">
                      <div className="w-full bg-void-element rounded-full h-3 mb-4 overflow-hidden">
                          <div className="bg-gradient-to-r from-void-accent to-green-400 h-full rounded-full transition-all duration-300" style={{ width: `${updateInfo.percent || 0}%` }}></div>
                      </div>
                      <p className="text-void-text-muted">Downloading update... <span className="text-white font-bold">{updateInfo.percent || 0}%</span></p>
                  </div>
              )}
              {updateStatus === 'downloaded' && (
                  <div className="flex flex-col items-center py-4">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-400 ring-1 ring-green-500/20">
                          <Check className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Ready to Install</h3>
                      <p className="text-void-text-muted mb-6">Version <span className="text-white font-mono bg-white/5 px-1.5 rounded">v{updateInfo.version}</span> has been downloaded. Restart to apply.</p>
                      <div className="flex w-full gap-3">
                          <button onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors">Later</button>
                          <button onClick={handleInstallUpdate} className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-900/20 transition-all">Restart & Update</button>
                      </div>
                  </div>
              )}
              {updateStatus === 'not-available' && (
                  <div className="flex flex-col items-center py-6">
                      <div className="w-16 h-16 bg-void-element rounded-full flex items-center justify-center mb-4 text-void-text-muted">
                          <Check className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">You're Up to Date</h3>
                      <p className="text-void-text-muted">VoidChat v{appVersion} is the latest version.</p>
                  </div>
              )}
              {updateStatus === 'error' && (
                  <div className="flex flex-col items-center py-6">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400 ring-1 ring-red-500/20">
                          <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Update Error</h3>
                      <p className="text-void-text-muted">{updateInfo.message || 'Something went wrong checking for updates.'}</p>
                  </div>
              )}
          </div>
      </Modal>

      {/* Mobile Menu Backdrop */}
      {(mobileMenuOpen || mobileMembersOpen) && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => {
                setMobileMenuOpen(false);
                setMobileMembersOpen(false);
            }}
        />
      )}

    </div>
  );
};

export default Dashboard;
