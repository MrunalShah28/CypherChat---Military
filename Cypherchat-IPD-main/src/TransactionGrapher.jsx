import React, { useState, useEffect } from 'react';
import { X, Activity, AlertTriangle, Network, ShieldCheck } from 'lucide-react';

const TransactionGrapher = ({ targetAddress, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // SIMULATION: Mocking an API call to a blockchain explorer
      setTimeout(() => {
        setData({
          riskScore: 85,
          transactions: [
            { type: 'IN', from: '0xMixer...88', val: '100 ETH', time: '2h ago', flag: true },
            { type: 'OUT', to: 'Binance_Hot', val: '50 ETH', time: '5h ago', flag: false },
            { type: 'OUT', to: 'Unknown_Wallet', val: '12 ETH', time: '1d ago', flag: true },
          ]
        });
        setLoading(false);
      }, 2000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#0a140a] border-2 border-[#1a331a] shadow-[0_0_50px_rgba(34,197,94,0.1)] font-mono text-[#4ade80]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#1a331a] bg-[#050a05]">
          <div className="flex items-center gap-3">
            <Network className="text-[#22c55e]" />
            <h2 className="text-xl font-bold tracking-widest text-white">TARGET_INTEL // {targetAddress.slice(0, 8)}...</h2>
          </div>
          <button onClick={onClose} className="hover:text-red-500 transition-colors"><X /></button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-16 h-16 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin"/>
              <div className="animate-pulse tracking-widest text-sm">TRACING BLOCKCHAIN LEDGER...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Risk Score Panel */}
              <div className="bg-black/40 border border-[#1a331a] p-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-gray-500 mb-2">THREAT SCORE</div>
                <div className={`text-5xl font-bold mb-2 ${data.riskScore > 50 ? 'text-red-500' : 'text-[#22c55e]'}`}>
                  {data.riskScore}
                </div>
                <div className={`text-xs px-2 py-1 font-bold ${data.riskScore > 50 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {data.riskScore > 50 ? 'HIGH RISK' : 'LOW RISK'}
                </div>
              </div>

              {/* Activity Log */}
              <div className="col-span-2 bg-black/40 border border-[#1a331a] p-4">
                <div className="flex items-center gap-2 mb-4 border-b border-[#1a331a] pb-2 text-gray-500 text-xs">
                  <Activity size={14} /> RECENT ON-CHAIN ACTIVITY
                </div>
                <div className="space-y-3">
                  {data.transactions.map((tx, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-[#22c55e]/5 border-l-2 border-transparent hover:border-[#22c55e] transition-all">
                      <div className="flex flex-col">
                        <span className={tx.type === 'IN' ? 'text-[#22c55e] font-bold' : 'text-red-400 font-bold'}>
                          {tx.type === 'IN' ? '<<< INCOMING' : '>>> OUTGOING'}
                        </span>
                        <span className="text-xs text-gray-500">{tx.time}</span>
                      </div>
                      <div className="font-mono text-gray-300">{tx.to || tx.from}</div>
                      <div className="text-white font-bold">{tx.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bottom Status */}
              <div className="col-span-3 border-t border-[#1a331a] pt-4 flex justify-between items-center text-xs text-gray-600">
                 <div className="flex items-center gap-2"><ShieldCheck size={14}/> DATABASE_SYNC: ACTIVE</div>
                 <div>SECURE_CONNECTION_V4</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionGrapher;