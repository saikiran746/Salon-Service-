import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { servicesAPI } from '../../services/api';
import { Plus, Pencil, Trash2, X, Clock, Upload, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK = { name: '', description: '', duration: 30, price: '', specialist_type: '', category: 'Hair', sort_order: 0, gender: 'Both' };

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Category management state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedServicesForCategory, setSelectedServicesForCategory] = useState([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [emptyCategories, setEmptyCategories] = useState([]);

  const load = () => {
    setLoading(true);
    servicesAPI.getAll({ is_active: 1 }).then(r => setServices(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(BLANK); setEditId(null); setImageFile(null); setModal('create'); };
  const openEdit = (svc) => { setForm({ name: svc.name, description: svc.description || '', duration: svc.duration, price: svc.price, specialist_type: svc.specialist_type || '', category: svc.category || 'Dry & Dehydrated Skin', sort_order: svc.sort_order || 0, gender: svc.gender || 'Both' }); setEditId(svc.id); setImageFile(null); setModal('edit'); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      if (modal === 'edit') { await servicesAPI.update(editId, fd); toast.success('Service updated.'); }
      else { await servicesAPI.create(fd); toast.success('Service created.'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    try { await servicesAPI.delete(id); toast.success('Service deleted.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  // Dynamically compute categories from services list + empty categories
  const dynamicCategories = [...new Set([...services.map(s => s.category || 'General'), ...emptyCategories])].filter(c => c !== 'General');
  const CATEGORIES = dynamicCategories.length > 0 ? ['General', ...dynamicCategories] : ['General'];
  const SPECIALISTS = ['hair', 'facial', 'nail', 'beauty', 'waxing'];

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return toast.error('Category name is required');
    
    
    setSaving(true);
    try {
      await servicesAPI.updateBulkCategory({
        category: newCategoryName.trim(),
        serviceIds: selectedServicesForCategory
      });
      if (selectedServicesForCategory.length === 0) {
        setEmptyCategories(prev => [...prev, newCategoryName.trim()]);
      }
      toast.success('Category added successfully.');
      setCategoryModalOpen(false);
      setNewCategoryName('');
      setSelectedServicesForCategory([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (catName, e) => {
    e.stopPropagation();
    if (!confirm(`Delete category "${catName}"? All its services will be moved to "General".`)) return;
    
    const servicesInCat = services.filter(s => (s.category || 'General').toLowerCase() === catName.toLowerCase());
    if (servicesInCat.length === 0) return;
    
    try {
      await servicesAPI.updateBulkCategory({
        category: 'General',
        serviceIds: servicesInCat.map(s => s.id)
      });
      toast.success('Category deleted.');
      if (activeCategory === catName) setActiveCategory('All');
      load();
    } catch (err) {
      toast.error('Failed to delete category.');
    }
  };

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Group services
  const groupedServices = CATEGORIES.reduce((acc, cat) => {
    const catServices = services.filter(s => {
      const matchesCategory = s.category && s.category.toLowerCase() === cat.toLowerCase();
      const matchesSearch = !search || 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
    if (catServices.length > 0) acc[cat] = catServices;
    return acc;
  }, {});

  const displayedCategories = activeCategory === 'All' 
    ? Object.keys(groupedServices) 
    : [activeCategory].filter(cat => groupedServices[cat]);

  return (
    <AdminLayout title="Services">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 flex-1">
          {['All', ...CATEGORIES].map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-sans uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                activeCategory === cat 
                  ? 'bg-gold-500 text-salon-black font-semibold' 
                  : 'bg-salon-dark text-salon-muted hover:text-gold-500 border border-salon-border hover:border-gold-500/50'
              }`}
            >
              <span>{cat}</span>
              {cat !== 'All' && cat !== 'General' && (
                <span 
                  onClick={(e) => handleDeleteCategory(cat, e)}
                  className={`p-0.5 rounded-full transition-colors ${activeCategory === cat ? 'hover:bg-salon-black/20' : 'hover:bg-red-500/20 hover:text-red-400'}`}
                  title="Delete Category"
                >
                  <X size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-salon-muted" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search treatments..." 
              className="input-dark pl-9 text-xs w-full py-2" 
            />
          </div>
          <button onClick={() => setCategoryModalOpen(true)} className="btn-dark text-xs px-5 py-2.5 flex items-center gap-2 shrink-0"><Plus size={13} /> Add Category</button>
          <button onClick={openCreate} className="btn-gold text-xs px-5 py-2.5 flex items-center gap-2 shrink-0"><Plus size={13} /> Add Service</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 shimmer rounded-sm" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {displayedCategories.map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="font-sans text-sm text-salon-muted uppercase tracking-wider font-semibold border-b border-salon-border/50 pb-2">
                {cat} ({groupedServices[cat].length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedServices[cat].map(svc => (
                  <div key={svc.id} className="admin-card overflow-hidden group">
                    {svc.image && (
                      <div className="aspect-video overflow-hidden -mx-6 -mt-6 mb-5">
                        <img src={svc.image} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display text-lg text-salon-white flex-1 pr-2">{svc.name}</h3>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => openEdit(svc)} className="text-salon-muted hover:text-gold-500 transition-colors p-1"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(svc.id)} className="text-salon-muted hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <p className="text-salon-muted text-xs font-body line-clamp-2 mb-4">{svc.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-salon-border">
                      <div className="flex items-center gap-1 text-salon-muted text-xs font-sans"><Clock size={11} /> {svc.duration}m</div>
                      <span className="font-display text-lg text-gold-500">₹{parseFloat(svc.price).toLocaleString('en-IN')}</span>
                      <div className="flex gap-2">
                        {svc.gender && svc.gender !== 'Both' && (
                          <span className={`badge capitalize ${svc.gender === 'Male' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'}`}>
                            {svc.gender}
                          </span>
                        )}
                        <span className="badge badge-gray capitalize">{svc.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {displayedCategories.length === 0 && (
            <div className="py-12 text-center border border-dashed border-salon-border rounded-lg bg-salon-dark">
              <p className="text-salon-muted font-sans text-sm">No services found in this category.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-salon-card border border-salon-border w-full max-w-lg my-4">
            <div className="flex justify-between items-center p-6 border-b border-salon-border">
              <h3 className="font-display text-xl text-salon-white">{modal === 'edit' ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setModal(null)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label-gold">Service Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-dark" placeholder="e.g. Signature Haircut" required />
              </div>
              <div>
                <label className="label-gold">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-dark resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-gold">Duration (min)</label>
                  <input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className="input-dark" min="15" step="15" required />
                </div>
                <div>
                  <label className="label-gold">Price (₹)</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-dark" min="0" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-gold">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-dark">
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-salon-dark capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-gold">Specialist Type</label>
                  <select value={form.specialist_type} onChange={e => setForm(p => ({ ...p, specialist_type: e.target.value }))} className="input-dark">
                    <option value="">Select Type</option>
                    {SPECIALISTS.map(s => <option key={s} value={s} className="bg-salon-dark">{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-gold">Target Gender</label>
                <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="input-dark">
                  <option value="Both" className="bg-salon-dark">Both (Unisex)</option>
                  <option value="Male" className="bg-salon-dark">Male Only</option>
                  <option value="Female" className="bg-salon-dark">Female Only</option>
                </select>
              </div>
              <div>
                <label className="label-gold">Service Image</label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-salon-border hover:border-gold-500 p-3 transition-colors">
                  <Upload size={14} className="text-salon-muted" />
                  <span className="text-salon-muted text-xs font-body">{imageFile ? imageFile.name : 'Choose image (JPG, PNG, WebP)'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-dark flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold flex-1 py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
                  {saving ? 'Saving...' : (modal === 'edit' ? 'Update Service' : 'Create Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-salon-card border border-salon-border w-full max-w-lg my-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-salon-border">
              <h3 className="font-display text-xl text-salon-white">Add New Category</h3>
              <button onClick={() => setCategoryModalOpen(false)} className="text-salon-muted hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label-gold">Category Name</label>
                <input 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  className="input-dark" 
                  placeholder="e.g. Summer Specials" 
                  required 
                />
                <p className="text-salon-muted text-[10px] mt-1.5">You can group existing services into this new category.</p>
              </div>
              
              <div>
                <label className="label-gold flex items-center justify-between mb-3">
                  <span>Select Services</span>
                  <span className="text-[10px] text-salon-muted lowercase">{selectedServicesForCategory.length} selected</span>
                </label>
                
                {services.length === 0 ? (
                  <p className="text-salon-muted text-xs italic">No services available. Create a service first.</p>
                ) : (
                  <>
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-salon-muted" />
                      <input 
                        type="text" 
                        value={serviceSearchQuery}
                        onChange={e => setServiceSearchQuery(e.target.value)}
                        placeholder="Search services by name or category..." 
                        className="input-dark pl-9 py-2 text-sm w-full"
                      />
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {services.filter(s => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (s.category && s.category.toLowerCase().includes(serviceSearchQuery.toLowerCase()))).map(svc => (
                      <label key={svc.id} className="flex items-center gap-3 p-3 rounded-lg border border-salon-border bg-salon-dark cursor-pointer hover:border-gold-500/50 transition-colors">
                        <input 
                          type="checkbox" 
                          className="accent-gold-500 w-4 h-4 rounded bg-salon-black border-salon-border"
                          checked={selectedServicesForCategory.includes(svc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServicesForCategory(prev => [...prev, svc.id]);
                            } else {
                              setSelectedServicesForCategory(prev => prev.filter(id => id !== svc.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-salon-white">{svc.name}</p>
                          <p className="text-[10px] text-salon-muted capitalize">Current: {svc.category || 'General'}</p>
                        </div>
                      </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-salon-border">
                <button type="button" onClick={() => setCategoryModalOpen(false)} className="btn-dark flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving || !newCategoryName.trim()} className="btn-gold flex-1 py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-salon-black/30 border-t-salon-black rounded-full animate-spin" /> : null}
                  {saving ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
