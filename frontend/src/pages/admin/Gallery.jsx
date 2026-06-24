import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { galleryAPI } from '../../services/api';
import { Plus, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminGallery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', caption: '', tags: '', category: 'Photos', is_before_after: false });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const CATEGORIES = ['All', 'Photos', 'Videos'];

  const load = () => {
    setLoading(true);
    galleryAPI.getAllAdmin().then(r => setPosts(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a media file.');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('media', file);
      await galleryAPI.create(fd);
      toast.success('Post created!');
      setShowCreate(false); setForm({ title: '', caption: '', tags: '', category: 'Photos', is_before_after: false }); setFile(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (id, current) => {
    try {
      await galleryAPI.update(id, { is_published: current ? 0 : 1 });
      setPosts(p => p.map(post => post.id === id ? { ...post, is_published: current ? 0 : 1 } : post));
    } catch { toast.error('Update failed.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try { await galleryAPI.delete(id); toast.success('Post deleted.'); load(); }
    catch { toast.error('Delete failed.'); }
  };

  const filteredPosts = posts.filter(post => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Photos') return post.media_type === 'image';
    if (activeCategory === 'Videos') return post.media_type === 'video';
    return post.category === activeCategory;
  });

  return (
    <AdminLayout title="Gallery">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-sans uppercase tracking-wider transition-all duration-300 ${
                activeCategory === cat 
                  ? 'bg-gold-500 text-salon-black font-semibold' 
                  : 'bg-salon-dark text-salon-muted hover:text-gold-500 border border-salon-border hover:border-gold-500/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-gold text-xs px-5 py-2.5 flex items-center gap-2 shrink-0"><Plus size={13} /> Add Post</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-square shimmer rounded-sm" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPosts.map(post => (
            <div key={post.id} className="relative group aspect-square bg-salon-card border border-salon-border overflow-hidden">
              {post.media_type === 'video' ? (
                <div className="w-full h-full bg-salon-dark flex items-center justify-center"><span className="text-gold-500 text-2xl">▶</span></div>
              ) : (
                <img src={post.media_url} alt={post.title || ''} className="w-full h-full object-cover" />
              )}
              {!post.is_published && <div className="absolute top-2 left-2 badge badge-gray text-[10px]">Hidden</div>}
              {post.is_before_after === 1 ? <div className="absolute top-2 right-2 badge badge-gold text-[10px]">B/A</div> : (
                post.category && <div className="absolute top-2 right-2 badge badge-gray text-[10px]">{post.category}</div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                <button onClick={() => togglePublish(post.id, post.is_published)} className="w-8 h-8 bg-salon-card border border-salon-border flex items-center justify-center text-salon-white hover:text-gold-500 transition-colors">
                  {post.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => handleDelete(post.id)} className="w-8 h-8 bg-salon-card border border-salon-border flex items-center justify-center text-salon-white hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filteredPosts.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-salon-dark border border-salon-border flex items-center justify-center mb-4">
                <EyeOff className="text-salon-muted" size={24} />
              </div>
              <h3 className="font-display text-xl text-salon-white mb-2">No media found</h3>
              <p className="text-salon-muted font-sans text-sm">No items match the selected category.</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-salon-card border border-salon-border w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-salon-border">
              <h3 className="font-display text-xl text-salon-white">Add Gallery Post</h3>
              <button onClick={() => setShowCreate(false)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="label-gold">Media File *</label>
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-salon-border hover:border-gold-500 p-6 transition-colors">
                  <Upload size={24} className="text-salon-muted" />
                  <span className="text-salon-muted text-xs font-body text-center">{file ? file.name : 'Click to upload image or video\nJPG, PNG, WebP, MP4'}</span>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={e => setFile(e.target.files[0])} required />
                </label>
              </div>
              {file && <div className="text-xs text-salon-muted font-body p-2 bg-salon-dark border border-salon-border">Selected: <span className="text-gold-500">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(1)}MB)</div>}
              
              <div>
                <label className="label-gold">Category</label>
                <select 
                  value={form.category} 
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))} 
                  className="input-dark"
                >
                  {CATEGORIES.filter(c => c !== 'All' && c !== 'Before & After').map(cat => (
                    <option key={cat} value={cat} className="bg-salon-dark">{cat}</option>
                  ))}
                </select>
              </div>

              <div><label className="label-gold">Title (optional)</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-dark" /></div>
              <div><label className="label-gold">Caption</label><textarea value={form.caption} onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} className="input-dark resize-none" rows={2} /></div>
              <div><label className="label-gold">Tags (comma-separated)</label><input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} className="input-dark" placeholder="haircut, color, balayage" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_before_after} onChange={e => setForm(p => ({ ...p, is_before_after: e.target.checked }))} className="accent-gold-500" />
                <span className="text-salon-muted text-xs font-sans">Before/After transformation</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-dark flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold flex-1 py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
                  {saving ? 'Uploading...' : 'Upload Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
