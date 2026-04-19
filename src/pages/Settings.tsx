import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon, 
  Save, 
  DollarSign, 
  BookOpen, 
  Calendar,
  ShieldCheck,
  Loader2
} from 'lucide-react';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    finePerDay: 10,
    maxBooksPerUser: 5,
    loanDurationDays: 14,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as any);
        } else {
          // Initialize default settings
          await setDoc(docRef, settings);
        }
      } catch (error) {
        toast.error('Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Library Settings</h1>
          <p className="text-slate-500 text-sm">Configure global library rules and policies</p>
        </div>
        <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
          <SettingsIcon size={24} />
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-8">
          {/* Fine Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900 font-bold">
              <DollarSign size={20} className="text-orange-500" />
              <h2>Fine Management</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Fine Per Day (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.finePerDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings({ ...settings, finePerDay: isNaN(val) ? 0 : val });
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
                <p className="text-xs text-slate-400 italic">Amount charged for each day after the due date.</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-50" />

          {/* Loan Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900 font-bold">
              <Calendar size={20} className="text-orange-500" />
              <h2>Loan Policies</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Default Loan Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.loanDurationDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings({ ...settings, loanDurationDays: isNaN(val) ? 0 : val });
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Max Books Per User</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.maxBooksPerUser}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings({ ...settings, maxBooksPerUser: isNaN(val) ? 0 : val });
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-50" />

          {/* Security & System */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900 font-bold">
              <ShieldCheck size={20} className="text-orange-500" />
              <h2>System Security</h2>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-600">
                Library policies are enforced at the database level using Firestore Security Rules. 
                Any changes made here will be reflected across the system immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-md disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
