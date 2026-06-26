import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

const InvoiceViewer = () => {
  const { id } = useParams();
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    // Generate the backend API URL directly
    const backendUrl = import.meta.env.VITE_API_URL;
    const fetchUrl = `${backendUrl}/billing/${id}/pdf`;

    const fetchInvoice = async () => {
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error('Invoice not found or expired');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        setError(err.message || 'Failed to load invoice');
        toast.error('Failed to load invoice');
      }
    };

    fetchInvoice();

    // Cleanup object URL to prevent memory leaks
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] p-8 rounded-xl max-w-md w-full text-center border border-white/10">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-display text-salon-white mb-2">Invoice Unavailable</h2>
          <p className="text-salon-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center">
        <Loader className="w-8 h-8 text-gold-500 animate-spin mb-4" />
        <p className="text-salon-white font-sans text-sm animate-pulse tracking-widest uppercase">
          Retrieving Invoice...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      <div className="bg-[#1A1A1A] border-b border-white/10 p-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="text-gold-500 text-lg">✦</div>
          <div>
            <h1 className="text-salon-white font-display tracking-widest uppercase text-sm md:text-base">TONI & GUY Essensuals</h1>
            <p className="text-[10px] text-salon-muted tracking-widest uppercase mt-0.5">Invoice Viewer</p>
          </div>
        </div>
        <a
          href={pdfUrl}
          download={`Invoice_${id.substring(0, 8)}.pdf`}
          className="btn-gold flex items-center gap-2 px-4 py-2 text-xs md:text-sm whitespace-nowrap"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">Download</span>
        </a>
      </div>
      
      <div className="flex-1 bg-black/40 overflow-hidden relative">
        <object 
          data={pdfUrl} 
          type="application/pdf" 
          className="w-full h-full absolute inset-0"
        >
          {/* Fallback for browsers that don't support inline PDFs (like mobile Safari) */}
          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0F0F0F]">
            <p className="text-salon-muted mb-6">Your device requires you to download this file to view it.</p>
            <a
              href={pdfUrl}
              download={`Invoice_${id.substring(0, 8)}.pdf`}
              className="btn-gold px-6 py-3 inline-block"
            >
              Download Invoice Now
            </a>
          </div>
        </object>
      </div>
    </div>
  );
};

export default InvoiceViewer;
