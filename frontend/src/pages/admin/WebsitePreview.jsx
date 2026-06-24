import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Monitor, Tablet, Smartphone, RotateCcw, ExternalLink } from 'lucide-react';

const devices = {
  desktop: { width: '100%', height: '100%', icon: Monitor, label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', icon: Tablet, label: 'Tablet' },
  mobile: { width: '375px', height: '812px', icon: Smartphone, label: 'Mobile' },
};

export default function WebsitePreview() {
  const [device, setDevice] = useState('desktop');
  const [key, setKey] = useState(0);

  const activeDevice = devices[device];
  const handleRefresh = () => setKey(k => k + 1);

  return (
    <AdminLayout title="Website Preview">
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <p className="text-white/50 text-[13px] font-sans">View your live website without leaving the admin panel</p>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/[0.05]">
            {Object.entries(devices).map(([k, config]) => {
              const DeviceIcon = config.icon;
              const isActive = device === k;
              return (
                <button
                  key={k}
                  onClick={() => setDevice(k)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-sans transition-all ${
                    isActive 
                      ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20' 
                      : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <DeviceIcon size={14} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-[#0A0A0A]/50 rounded-2xl border border-white/[0.05] flex flex-col relative items-center justify-center p-4">
          {/* Browser Mockup */}
          <div 
            className="flex flex-col bg-[#111] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ease-in-out"
            style={{ 
              width: device === 'desktop' ? '100%' : activeDevice.width,
              height: device === 'desktop' ? '100%' : activeDevice.height,
              maxHeight: '100%',
              maxWidth: '100%'
            }}
          >
            {/* Browser Header */}
            <div className="h-12 bg-[#1A1A1A] border-b border-white/[0.05] flex items-center px-4 gap-4 flex-shrink-0">
              {/* Traffic Lights */}
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>

              {/* URL Bar */}
              <div className="flex-1 flex justify-center">
                <div className="bg-[#0A0A0A] border border-white/[0.05] rounded-lg px-4 py-1.5 flex items-center gap-2 max-w-md w-full">
                  <span className="text-white/30 text-[10px]">🔒</span>
                  <span className="text-white/50 text-[11px] font-mono tracking-wider">localhost:5173 /</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={handleRefresh} className="text-white/30 hover:text-white/80 transition-colors">
                  <RotateCcw size={14} />
                </button>
                <a href="/" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/80 transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Iframe content */}
            <div className="flex-1 bg-white relative">
              <iframe
                key={key}
                src="/"
                className="absolute inset-0 w-full h-full border-0"
                title="Website Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
