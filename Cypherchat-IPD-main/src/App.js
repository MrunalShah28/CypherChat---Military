import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { format } from 'date-fns';
import { 
  Wallet, Send, ArrowLeft, Loader2, UserPlus, 
  Shield, Search, Crosshair, Terminal, Power
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// IMPORT THE NEW COMPONENT
import TransactionGrapher from './TransactionGrapher';

// ==========================================
// CONFIGURATION
// ==========================================
const CONTRACT_ADDRESS = "0xdE58cf41357F3aAa2892Cc50b4b3c19F9A9d470f"; 
const SEPOLIA_ID = 11155111n;
const ABI = [
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" } ], "name": "MessageSent", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "userAddress", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" } ], "name": "UserRegistered", "type": "event" },
  { "inputs": [{ "internalType": "string", "name": "_name", "type": "string" }], "name": "register", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "string", "name": "_content", "type": "string" } ], "name": "sendMessage", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "_user1", "type": "address" }, { "internalType": "address", "name": "_user2", "type": "address" } ], "name": "getMessages", "outputs": [ { "components": [ { "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "receiver", "type": "address" }, { "internalType": "string", "name": "content", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "internalType": "bool", "name": "isRead", "type": "bool" } ], "internalType": "struct ChainChat.Message[]", "name": "", "type": "tuple[]" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getMyContacts", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "users", "outputs": [ { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "bool", "name": "exists", "type": "bool" } ], "stateMutability": "view", "type": "function" }
];

const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [allMessages, setAllMessages] = useState([]); 
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactAddress, setNewContactAddress] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // === NEW STATE FOR GRAPHER ===
  const [showGrapher, setShowGrapher] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('chainchat_contacts');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  const currentChatMessages = useMemo(() => {
    if (!activeChat || !account) return [];
    const activeAddr = activeChat.address.toLowerCase();
    const myAddr = account.toLowerCase();
    return allMessages.filter(msg => 
      (msg.sender.toLowerCase() === myAddr && msg.receiver.toLowerCase() === activeAddr) ||
      (msg.sender.toLowerCase() === activeAddr && msg.receiver.toLowerCase() === myAddr)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, activeChat, account]);

  useEffect(() => {
    if (!contract || !account || !activeChat) return;
    const fetchMessages = async () => {
      try {
        const data = await contract.getMessages(account, activeChat.address);
        const formatted = data.map(msg => ({
          sender: msg.sender,
          receiver: msg.receiver,
          text: msg.content,
          timestamp: Number(msg.timestamp) * 1000,
          pending: false
        }));
        setAllMessages(prev => {
             const pending = prev.filter(m => m.pending);
             return [...formatted, ...pending];
        });
      } catch (err) { console.error("Polling error:", err); }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); 
    return () => clearInterval(interval);
  }, [contract, account, activeChat]);

  const connectWallet = async () => {
    if (!window.ethereum) return toast.error("Hardware Wallet Not Found");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (network.chainId !== SEPOLIA_ID) {
        try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] }); } 
        catch (e) { toast.error("Switch to Sepolia Network"); setLoading(false); return; }
      }
      const signer = await provider.getSigner();
      const _contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      setAccount(accounts[0].toLowerCase());
      setContract(_contract);
      const user = await _contract.users(accounts[0]);
      if (user.exists) { setIsRegistered(true); toast.success(`Uplink Established: ${user.name}`); } 
      else { setIsRegistered(false); toast.info("New Unit Detected"); }
    } catch (err) { console.error(err); toast.error("Connection Refused"); } 
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!registerName.trim()) return toast.warn("Callsign Required");
    setIsRegistering(true);
    try {
      const tx = await contract.register(registerName);
      await tx.wait();
      setIsRegistered(true);
      toast.success("Identity Confirmed");
    } catch (err) { console.error(err); toast.error("Registration Failed"); } 
    finally { setIsRegistering(false); }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    const textToSend = messageInput;
    setMessageInput(""); 
    const tempMsg = { sender: account, receiver: activeChat.address, text: textToSend, timestamp: Date.now(), pending: true };
    setAllMessages(prev => [...prev, tempMsg]);
    try {
      const tx = await contract.sendMessage(activeChat.address, textToSend);
      await tx.wait();
    } catch (err) {
      setAllMessages(prev => prev.filter(m => m !== tempMsg)); 
      setMessageInput(textToSend); 
      toast.error("Transmission Failed");
    }
  };

  const handleAddContact = () => {
    if (!newContactName || !newContactAddress) return toast.warn("Incomplete Data");
    if (!ethers.isAddress(newContactAddress)) return toast.error("Invalid Coordinates");
    const newContact = { id: Date.now(), name: newContactName, address: newContactAddress.toLowerCase(), addedAt: Date.now() };
    setContacts([...contacts, newContact]);
    localStorage.setItem('chainchat_contacts', JSON.stringify([...contacts, newContact]));
    setIsAddContactOpen(false); setNewContactName(""); setNewContactAddress("");
    toast.success("Target Saved");
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentChatMessages, activeChat]);

  // ==========================================
  // MILITARY UI RENDER
  // ==========================================

  const colors = {
    bg: "bg-[#050a05]", // Deep dark green/black
    panel: "bg-[#0a140a]",
    border: "border-[#1a331a]",
    text: "text-[#4ade80]", // Terminal green
    accent: "bg-[#22c55e]",
    alert: "text-red-500 border-red-500 bg-red-900/10"
  };

  if (!account) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg} p-4 font-mono ${colors.text}`}>
        <ToastContainer theme="dark" />
        <div className={`${colors.panel} p-8 border-2 ${colors.border} w-full max-w-md text-center shadow-[0_0_20px_rgba(34,197,94,0.1)]`}>
          <div className="w-20 h-20 border-2 border-[#22c55e] rounded-full mx-auto flex items-center justify-center mb-6 animate-pulse">
            <Power size={40} className="text-[#22c55e]" />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.2em] mb-2 text-white">CYPHER_NET</h1>
          <p className="opacity-60 mb-8 text-xs">SECURE MILITARY UPLINK</p>
          <button onClick={connectWallet} disabled={loading} className={`w-full border ${colors.border} hover:bg-[#22c55e] hover:text-black p-4 uppercase tracking-widest font-bold flex items-center justify-center gap-3 transition-all`}>
            {loading ? <Loader2 className="animate-spin" /> : <Wallet />}
            <span>INITIALIZE UPLINK</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg} p-4 font-mono ${colors.text}`}>
        <ToastContainer theme="dark" />
        <div className={`${colors.panel} p-8 border-2 ${colors.border} w-full max-w-md text-center`}>
          <h2 className="text-xl font-bold mb-2 uppercase text-white">Identity Verification</h2>
          <input className={`w-full bg-black border ${colors.border} p-4 text-[#22c55e] mb-4 outline-none`} placeholder="ENTER CALLSIGN..." value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
          <button onClick={handleRegister} disabled={isRegistering} className="w-full bg-[#22c55e] text-black p-4 font-bold uppercase hover:bg-white transition-colors">
            {isRegistering ? <Loader2 className="animate-spin inline" /> : "CONFIRM"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${colors.bg} overflow-hidden relative font-mono ${colors.text}`}>
      <ToastContainer theme="dark" position="top-right" />

      {/* SIDEBAR */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 ${colors.panel} border-r ${colors.border}`}>
        <div className={`p-4 h-16 flex items-center justify-between border-b ${colors.border} bg-black/40`}>
          <div className="flex items-center gap-2 font-bold tracking-widest text-white"><Terminal size={18}/> OPS_CENTER</div>
          <div className={`text-[10px] border ${colors.border} px-2 py-1`}>{shortenAddress(account)}</div>
        </div>
        <div className={`p-4 border-b ${colors.border}`}>
          <div className={`flex items-center bg-black border ${colors.border} px-3 py-2`}>
            <Search size={14} className="text-gray-500 mr-2"/>
            <input className="bg-transparent outline-none text-xs text-white w-full" placeholder="SEARCH UNITS..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
            <div key={contact.id} onClick={() => setActiveChat(contact)} className={`px-4 py-3 cursor-pointer border-l-2 hover:bg-[#22c55e]/10 ${activeChat?.id === contact.id ? 'bg-[#22c55e]/10 border-[#22c55e] text-white' : 'border-transparent text-gray-500'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${activeChat?.id === contact.id ? 'bg-[#22c55e] animate-pulse' : 'bg-gray-600'}`}></div>
                <div><h3 className="font-bold text-xs">{contact.name}</h3><p className="text-[10px] opacity-60">{shortenAddress(contact.address)}</p></div>
              </div>
            </div>
          ))}
        </div>
        <div className={`p-4 border-t ${colors.border}`}>
           <button onClick={() => setIsAddContactOpen(true)} className={`w-full border ${colors.border} hover:border-[#22c55e] text-gray-400 hover:text-[#22c55e] py-3 text-xs flex items-center justify-center gap-2 uppercase tracking-wider`}>
             <UserPlus size={14}/> Add Target
           </button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-[#050a05]`}>
        {activeChat ? (
          <>
            <div className={`h-16 px-4 border-b ${colors.border} flex items-center justify-between ${colors.panel} z-20`}>
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-[#22c55e]"><ArrowLeft/></button>
                <div>
                  <h2 className="font-bold text-white tracking-widest">{activeChat.name}</h2>
                  <div className="text-[10px] text-[#22c55e]">SECURE CHANNEL</div>
                </div>
              </div>

              {/* === THE INVESTIGATE BUTTON YOU REQUESTED === */}
              <button 
                onClick={() => setShowGrapher(true)} 
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase border hover:bg-red-500 hover:text-black transition-all ${colors.alert}`}
              >
                <Crosshair size={16} /> INVESTIGATE TARGET
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentChatMessages.map((msg, i) => {
                const isMe = msg.sender.toLowerCase() === account.toLowerCase();
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 border ${isMe ? 'border-[#22c55e] bg-[#22c55e]/5 text-white' : 'border-gray-800 bg-black/60 text-gray-300'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <div className="text-[10px] mt-1 opacity-50 text-right">{format(new Date(msg.timestamp), 'HH:mm')}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={`p-4 ${colors.panel} border-t ${colors.border}`}>
              <div className="flex gap-2">
                <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="ENTER COMMAND..." className={`flex-1 bg-black border ${colors.border} px-4 py-3 focus:border-[#22c55e] outline-none text-white`}/>
                <button onClick={sendMessage} className="bg-[#22c55e] text-black px-6 font-bold hover:bg-white transition-colors"><Send size={20}/></button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-600">
             <Shield size={64} className="mb-4 opacity-20"/>
             <p className="tracking-widest">AWAITING TARGET SELECTION</p>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isAddContactOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`${colors.panel} border-2 ${colors.border} p-6 w-full max-w-md`}>
               <h3 className="text-white font-bold mb-4 tracking-widest uppercase">Add New Unit</h3>
               <input className={`w-full bg-black border ${colors.border} p-3 mb-2 text-white outline-none focus:border-[#22c55e]`} placeholder="CALLSIGN" value={newContactName} onChange={e => setNewContactName(e.target.value)}/>
               <input className={`w-full bg-black border ${colors.border} p-3 mb-4 text-white outline-none focus:border-[#22c55e] text-xs`} placeholder="WALLET ADDRESS (0x...)" value={newContactAddress} onChange={e => setNewContactAddress(e.target.value)}/>
               <div className="flex gap-2">
                  <button onClick={() => setIsAddContactOpen(false)} className="flex-1 border border-gray-600 text-gray-400 py-3 uppercase text-xs">Cancel</button>
                  <button onClick={handleAddContact} className="flex-1 bg-[#22c55e] text-black font-bold py-3 uppercase text-xs">Confirm</button>
               </div>
            </div>
         </div>
      )}

      {/* === TRANSACTION GRAPHER POPUP === */}
      {showGrapher && activeChat && (
        <TransactionGrapher 
          isOpen={showGrapher} 
          onClose={() => setShowGrapher(false)} 
          targetAddress={activeChat.address} 
        />
      )}
    </div>
  );
}