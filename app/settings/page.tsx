'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Lock, User, School, Save, Database, Brain, Clock, ChevronRight, Pencil, Trash2, Eye, EyeOff, UserPlus, ShieldAlert, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

interface YearLevelCheckoutTime {
  level: string;
  time: string;
}

interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

type MLRiskThreshold = 'critical' | 'high' | 'medium' | 'all';
type MLUpdateFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';

interface MLSettings {
  riskAlertsEnabled: boolean;
  predictionsEnabled: boolean;
  riskThreshold: MLRiskThreshold;
  updateFrequency: MLUpdateFrequency;
}

const DEFAULT_ML_SETTINGS: MLSettings = {
  riskAlertsEnabled: true,
  predictionsEnabled: true,
  riskThreshold: 'high',
  updateFrequency: 'daily',
};

export default function SettingsPage() {
  const MIN_SKELETON_DURATION_MS = 650;
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('account');
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoCheckout, setAutoCheckout] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mlSettings, setMlSettings] = useState<MLSettings>(DEFAULT_ML_SETTINGS);
  const [yearLevelTimes, setYearLevelTimes] = useState<YearLevelCheckoutTime[]>([
    { level: 'Toddler & Nursery', time: '11:30' },
    { level: 'Pre-K', time: '11:30' },
    { level: 'Kinder 1', time: '12:00' },
    { level: 'Kinder 2', time: '12:00' },
    { level: 'Grade 1', time: '15:00' },
    { level: 'Grade 2', time: '15:00' },
    { level: 'Grade 3', time: '15:00' },
    { level: 'Grade 4', time: '16:00' },
    { level: 'Grade 5', time: '16:00' },
    { level: 'Grade 6', time: '16:00' },
    { level: 'Grade 7', time: '16:00' },
    { level: 'Grade 8', time: '16:00' },
  ]);


  // State for new user creation
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'teacher',
  });
  const [newUserErrors, setNewUserErrors] = useState<{ email?: string; password?: string; role?: string }>({});
  const [creatingUser, setCreatingUser] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  // State for user listing, deletion, and editing
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; name: string } | null>(null);

  // State for editing user
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('teacher');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editErrors, setEditErrors] = useState<{ password?: string; full_name?: string }>({});
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast({
          title: 'Failed to load users',
          description: data.error || 'Could not fetch users',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to load users',
        description: err.message || 'Could not fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'account') {
      fetchUsers();
    }
  }, [activeCategory]);

  // Open modal for delete confirmation
  const handleDeleteUser = (id: string, name: string) => {
    setConfirmDeleteUser({ id, name });
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!confirmDeleteUser) return;
    setDeletingUserId(confirmDeleteUser.id);
    try {
      const res = await fetch('/api/auth/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDeleteUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User Deleted',
          description: `${confirmDeleteUser.name} was deleted successfully.`,
          variant: 'default',
        });
        setUsers((prev) => prev.filter((u) => u.id !== confirmDeleteUser.id));
      } else {
        toast({
          title: 'Failed to Delete User',
          description: data.error || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to Delete User',
        description: err.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
      setConfirmDeleteUser(null);
    }
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
    if (name === 'email' && value.trim()) {
      setNewUserErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (name === 'password' && value.trim()) {
      setNewUserErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleNewUserRoleChange = (value: string) => {
    setNewUser((prev) => ({ ...prev, role: value }));
    if (value) {
      setNewUserErrors((prev) => ({ ...prev, role: undefined }));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingInputs: string[] = [];
    const validationErrors: { email?: string; password?: string; role?: string } = {};

    if (!newUser.email.trim()) {
      missingInputs.push('Email');
      validationErrors.email = 'Please provide an email.';
    }
    if (!newUser.password.trim()) {
      missingInputs.push('Password');
      validationErrors.password = 'Please provide a password.';
    } else if (newUser.password.trim().length < 6) {
      validationErrors.password = 'Password must be at least 6 characters.';
    }
    if (!newUser.role.trim()) {
      missingInputs.push('Role');
      validationErrors.role = 'Please select a role.';
    }

    if (missingInputs.length > 0 || Object.keys(validationErrors).length > 0) {
      setNewUserErrors(validationErrors);
      if (missingInputs.length > 0) {
        toast({
          title: 'Required Inputs Missing',
          description: `Please complete: ${missingInputs.join(', ')}`,
          variant: 'destructive',
        });
      }
      return;
    }

    setNewUserErrors({});
    setCreatingUser(true);
    try {
      const res = await fetch('/api/auth/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User added',
          description: `${newUser.full_name || newUser.email} was added successfully.`,
          variant: 'default',
        });
        setNewUser({ email: '', password: '', full_name: '', role: 'teacher' });
        setNewUserErrors({});
        fetchUsers();
      } else {
        toast({
          title: 'Failed to Create User',
          description: data.error || 'Failed to create user',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to Create User',
        description: err.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = (user: { id: string; name: string; email: string; role: string }) => {
    setEditingUser(user);
    setEditFullName(user.name || '');
    setEditRole(user.role || 'teacher');
    setEditPassword('');
    setEditErrors({});
    setShowEditPassword(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const validationErrors: { password?: string; full_name?: string } = {};
    if (!editFullName.trim()) {
      validationErrors.full_name = 'Full name is required.';
    }
    if (editPassword && editPassword.trim().length < 6) {
      validationErrors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);
      return;
    }

    setUpdatingUser(true);
    try {
      const res = await fetch('/api/auth/update-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editFullName.trim(),
          role: editRole,
          password: editPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User updated',
          description: 'The user account details have been successfully updated.',
          variant: 'default',
        });
        setEditingUser(null);
        fetchUsers();
      } else {
        toast({
          title: 'Update failed',
          description: data.error || 'Failed to update user.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message || 'An error occurred during user update.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUser(false);
    }
  };

  const categories: SettingsCategory[] = [
    { id: 'account', label: 'Account Management', icon: <User size={20} />, color: 'purple' },
    { id: 'ml', label: 'ML Settings', icon: <Brain size={20} />, color: 'violet' },
  ];

  // Load settings from database
  useEffect(() => {
    const loadSettingsFromDB = async () => {
      try {
        const timesRes = await fetch('/api/settings?key=yearLevelCheckoutTimes');
        const timesJson = await timesRes.json();
        if (timesRes.ok && timesJson.success && timesJson.data) {
          setYearLevelTimes(timesJson.data);
        }

        const mlRes = await fetch('/api/settings?key=mlSettings');
        const mlJson = await mlRes.json();
        if (mlRes.ok && mlJson.success && mlJson.data) {
          const parsed = mlJson.data as Partial<MLSettings>;
          const normalizedSettings = {
            riskAlertsEnabled:
              typeof parsed.riskAlertsEnabled === 'boolean'
                ? parsed.riskAlertsEnabled
                : DEFAULT_ML_SETTINGS.riskAlertsEnabled,
            predictionsEnabled:
              typeof parsed.predictionsEnabled === 'boolean'
                ? parsed.predictionsEnabled
                : DEFAULT_ML_SETTINGS.predictionsEnabled,
            riskThreshold:
              parsed.riskThreshold === 'critical' ||
              parsed.riskThreshold === 'high' ||
              parsed.riskThreshold === 'medium' ||
              parsed.riskThreshold === 'all'
                ? parsed.riskThreshold
                : DEFAULT_ML_SETTINGS.riskThreshold,
            updateFrequency:
              parsed.updateFrequency === 'realtime' ||
              parsed.updateFrequency === 'hourly' ||
              parsed.updateFrequency === 'daily' ||
              parsed.updateFrequency === 'weekly'
                ? parsed.updateFrequency
                : DEFAULT_ML_SETTINGS.updateFrequency,
          };
          setMlSettings(normalizedSettings);
          window.localStorage.setItem('mlSettings', JSON.stringify(normalizedSettings));
        }
      } catch (error) {
        console.error('Error loading settings from database:', error);
      }
    };

    loadSettingsFromDB();

    const loadingTimer = window.setTimeout(() => {
      setInitialLoading(false);
    }, MIN_SKELETON_DURATION_MS);

    return () => {
      window.clearTimeout(loadingTimer);
    };
  }, []);

  const handleYearLevelTimeChange = (index: number, newTime: string) => {
    const updatedTimes = [...yearLevelTimes];
    updatedTimes[index].time = newTime;
    setYearLevelTimes(updatedTimes);
  };

  const handleSaveSettings = async () => {
    try {
      const timesRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'yearLevelCheckoutTimes', value: yearLevelTimes }),
      });
      const timesJson = await timesRes.json();

      const mlRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'mlSettings', value: mlSettings }),
      });
      const mlJson = await mlRes.json();

      if (timesJson.success && mlJson.success) {
        window.localStorage.setItem('mlSettings', JSON.stringify(mlSettings));
        window.dispatchEvent(
          new CustomEvent('ml-settings-updated', {
            detail: mlSettings,
          })
        );
        window.dispatchEvent(
          new CustomEvent('year-level-checkout-times-updated', {
            detail: yearLevelTimes,
          })
        );

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        toast({
          title: 'Settings saved',
          description: 'Account and ML settings were updated successfully in the database.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Failed to save settings',
          description: timesJson.error || mlJson.error || 'Failed to update settings in the database.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-600 to-blue-700',
      purple: 'from-blue-600 to-blue-700',
      emerald: 'from-emerald-600 to-emerald-700',
      green: 'from-green-600 to-green-700',
      orange: 'from-orange-600 to-orange-700',
      red: 'from-red-600 to-red-700',
      violet: 'from-violet-600 to-violet-700',
    };
    return colors[color] || 'from-slate-600 to-slate-700';
  };

  const handleCategoryCancel = (categoryId: string) => {
    console.log(`Cancelled changes for ${categoryId}`);
  };


  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-10 w-72 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-96 rounded bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card p-6 lg:col-span-1">
              <div className="mb-4 h-5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3">
                <div className="h-11 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-11 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-11 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-11 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-6 lg:col-span-3">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700 md:col-span-2" />
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <div className="h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in-up">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Account & ML Settings</h1>
          <p className="text-base text-gray-600 dark:text-gray-300">Manage user accounts and machine-learning behavior</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-border/60 lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-3 sm:px-4 rounded-lg transition-all duration-200 text-left font-medium ${
                      activeCategory === category.id
                        ? `bg-linear-to-r ${getCategoryColor(category.color)} text-white shadow-md`
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {category.icon}
                      <span className="truncate">{category.label}</span>
                    </div>
                    {activeCategory === category.id && <ChevronRight size={18} />}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* School Information */}
            {activeCategory === 'school' && (
              <Card className="shadow-xl duration-200 animate-fade-in-up border-0 overflow-hidden">
                <CardHeader className="bg-linear-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 border-b border-blue-200/50 dark:border-blue-700/40 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">School Information</CardTitle>
                      <CardDescription className="text-sm mt-2">Update your school details and contact information</CardDescription>
                    </div>
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-white shadow-lg shrink-0">
                      <School size={32} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="schoolName" className="text-sm font-bold text-slate-700 dark:text-slate-300">School Name</Label>
                      <Input id="schoolName" defaultValue="SafeGate Academy" placeholder="Enter school name" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="schoolCode" className="text-sm font-bold text-slate-700 dark:text-slate-300">School Code</Label>
                      <Input id="schoolCode" defaultValue="SGA-2026" placeholder="Enter school code" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="address" className="text-sm font-bold text-slate-700 dark:text-slate-300">Address</Label>
                    <Input id="address" defaultValue="123 Education Street, City" placeholder="Enter school address" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Phone Number</Label>
                      <Input id="phone" defaultValue="+1 (555) 123-4567" placeholder="Enter phone number" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</Label>
                      <Input id="email" type="email" defaultValue="admin@safegate.edu" placeholder="Enter email" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap justify-end gap-3 pt-6">
                  <Button variant="outline" className="min-w-32 rounded-lg" onClick={() => handleCategoryCancel('school')}>Cancel</Button>
                  <Button className="min-w-32 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all" onClick={handleSaveSettings}>
                    <Save size={16} />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Account Settings */}
            {activeCategory === 'account' && (
              <Card className="shadow-xl animate-fade-in-up border-0 overflow-hidden">
                <CardHeader className="bg-linear-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 border-b border-blue-200/50 dark:border-blue-700/40 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Account Management</CardTitle>
                      <CardDescription className="text-sm mt-2">Add new users and manage existing accounts</CardDescription>
                    </div>
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-white shadow-lg shrink-0">
                      <User size={32} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                  {/* Add New User Form */}
                  <div className="p-6 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-800/50 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Add New User</h3>
                    <form className="space-y-6" onSubmit={handleCreateUser} autoComplete="off" noValidate>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="newUserEmail" className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</Label>
                          <Input id="newUserEmail" name="email" type="email" required value={newUser.email} onChange={handleNewUserChange} placeholder="user@email.com" autoComplete="off" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                          {newUserErrors.email && <p className="text-sm text-red-600 dark:text-red-400">{newUserErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newUserPassword" className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</Label>
                          <Input id="newUserPassword" name="password" type="password" required value={newUser.password} onChange={handleNewUserChange} placeholder="••••••••" autoComplete="new-password" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                          {newUserErrors.password && <p className="text-sm text-red-600 dark:text-red-400">{newUserErrors.password}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newUserRole" className="text-sm font-bold text-slate-700 dark:text-slate-300">Role</Label>
                          <Select value={newUser.role} onValueChange={handleNewUserRoleChange}>
                            <SelectTrigger id="newUserRole" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="teacher">Teacher</SelectItem>
                              <SelectItem value="guidance">Guidance</SelectItem>
                            </SelectContent>
                          </Select>
                          {newUserErrors.role && <p className="text-sm text-red-600 dark:text-red-400">{newUserErrors.role}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="newUserFullName" className="text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</Label>
                          <Input id="newUserFullName" name="full_name" value={newUser.full_name} onChange={handleNewUserChange} placeholder="Full Name" autoComplete="off" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500" />
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end mt-2">
                        <Button type="submit" className="min-w-32 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all" disabled={creatingUser}>
                          {creatingUser ? 'Creating...' : 'Add User'}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Gap between Add User and User List */}
                  <div className="h-2" />
                  {/* User List */}
                  <div className="p-6 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-800/50 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">User Accounts</h3>
                    {loadingUsers ? (
                      <div className="text-center py-6 text-slate-500 dark:text-slate-400">Loading users...</div>
                    ) : users.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 dark:text-slate-400">No users found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Role</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user) => (
                              <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="px-4 py-2 whitespace-nowrap">{user.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{user.email}</td>
                                <td className="px-4 py-2 whitespace-nowrap capitalize">{user.role}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-md"
                                      onClick={() => handleEditUser(user)}
                                    >
                                      <Edit3 size={14} />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="rounded-md"
                                      disabled={deletingUserId === user.id}
                                      onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                                    >
                                      {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
              <DialogContent showCloseButton={false} className="w-[96vw] max-w-2xl h-auto max-h-[92vh] overflow-hidden p-0 flex flex-col rounded-xl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-2xl font-bold">Edit User</DialogTitle>
                      <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                        Update the user's full name, role, or reset their password. Leave the password blank to keep the existing password.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <form onSubmit={handleUpdateUser} className="bg-white dark:bg-slate-950 px-6 pb-6 pt-4 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="editUserEmail" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                      <Input id="editUserEmail" value={editingUser?.email ?? ''} disabled className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 rounded-lg h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editUserRole" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role</Label>
                      <Select value={editRole} onValueChange={(value) => setEditRole(value)}>
                        <SelectTrigger id="editUserRole" className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="guidance">Guidance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="editUserFullName" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</Label>
                      <Input id="editUserFullName" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Full Name" className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11" />
                      {editErrors.full_name && <p className="text-sm text-red-600 dark:text-red-400">{editErrors.full_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editUserPassword" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                      <Input id="editUserPassword" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep current password" className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11" autoComplete="new-password" />
                      {editErrors.password && <p className="text-sm text-red-600 dark:text-red-400">{editErrors.password}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 items-end pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-600 dark:text-slate-400">You must confirm this change before it can be saved.</div>
                    <div className="flex flex-wrap gap-3 justify-end">
                      <Button variant="outline" type="button" onClick={() => setEditingUser(null)} className="min-w-24">
                        Cancel
                      </Button>
                      <Button type="submit" className="min-w-28 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg" disabled={updatingUser}>
                        {updatingUser ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Notifications */}
            {activeCategory === 'notifications' && (
              <Card className="shadow-xl animate-fade-in-up border-0 overflow-hidden">
                <CardHeader className="bg-linear-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30 border-b border-orange-200/50 dark:border-orange-700/40 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</CardTitle>
                      <CardDescription className="text-sm mt-2">Configure how you receive alerts and updates</CardDescription>
                    </div>
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Bell size={32} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">Push Notifications</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Receive push notifications for important events</p>
                      </div>
                      <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                  </div>
                  <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">Email Alerts</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Get email notifications for daily reports</p>
                      </div>
                      <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap justify-end gap-3 pt-6">
                  <Button variant="outline" className="min-w-32 rounded-lg" onClick={() => handleCategoryCancel('notifications')}>Cancel</Button>
                  <Button className="min-w-32 bg-linear-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all" onClick={handleSaveSettings}>
                    <Save size={16} />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Security */}
            {activeCategory === 'security' && (
              <Card className="shadow-xl animate-fade-in-up border-0 overflow-hidden">
                <CardHeader className="bg-linear-to-r from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/30 border-b border-red-200/50 dark:border-red-700/40 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Security</CardTitle>
                      <CardDescription className="text-sm mt-2">Update your password and security settings</CardDescription>
                    </div>
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br from-red-400 to-red-600 dark:from-red-500 dark:to-red-700 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Lock size={32} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="space-y-3">
                    <Label htmlFor="currentPassword" className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Password</Label>
                    <Input id="currentPassword" type="password" placeholder="••••••••" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500" />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="newPassword" className="text-sm font-bold text-slate-700 dark:text-slate-300">New Password</Label>
                    <Input id="newPassword" type="password" placeholder="••••••••" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500" />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="••••••••" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500" />
                  </div>
                  <div className="bg-red-50/70 dark:bg-red-950/20 border border-red-200/50 dark:border-red-700/30 rounded-lg p-4 mt-6">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <span className="font-bold">⚠️ Security Tip:</span> Use a strong password with uppercase, lowercase, numbers, and special characters.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap justify-end gap-3 pt-6">
                  <Button variant="outline" className="min-w-32 rounded-lg" onClick={() => handleCategoryCancel('security')}>Cancel</Button>
                  <Button className="min-w-32 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all" onClick={handleSaveSettings}>
                    <Save size={16} />
                    Update Password
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* System Settings */}
            {activeCategory === 'system' && (
              <Card className="shadow-xl animate-fade-in-up border-0 overflow-hidden">
                <CardHeader className="bg-linear-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30 border-b border-emerald-200/50 dark:border-emerald-700/40 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</CardTitle>
                      <CardDescription className="text-sm mt-2">Configure system behavior and preferences</CardDescription>
                    </div>
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Database size={32} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">Auto Check-out</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Automatically check out students at end of day</p>
                      </div>
                      <Switch checked={autoCheckout} onCheckedChange={setAutoCheckout} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="timezone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Timezone</Label>
                    <Select defaultValue="pst">
                      <SelectTrigger id="timezone" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                        <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
                        <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                        <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap justify-end gap-3 pt-6">
                  <Button variant="outline" className="min-w-32 rounded-lg" onClick={() => handleCategoryCancel('system')}>Cancel</Button>
                  <Button className="min-w-32 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all" onClick={handleSaveSettings}>
                    <Save size={16} />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* ML Settings */}
            {activeCategory === 'ml' && (
              <Card className="shadow-xl animate-fade-in-up border-0 overflow-hidden">
                <CardHeader className="bg-linear-to-r from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/30 border-b border-violet-200/50 dark:border-violet-700/40 p-5 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">ML Prediction Settings</CardTitle>
                      <CardDescription className="text-sm mt-2">Configure machine learning and AI features</CardDescription>
                    </div>
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-linear-to-br from-violet-400 to-violet-600 dark:from-violet-500 dark:to-violet-700 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Brain size={32} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">ML Risk Alerts</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Receive alerts for students at risk of absence</p>
                      </div>
                      <Switch
                        checked={mlSettings.riskAlertsEnabled}
                        onCheckedChange={(checked) =>
                          setMlSettings((prev) => ({ ...prev, riskAlertsEnabled: checked }))
                        }
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">Enable Predictions</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Use ML to predict student absences and behaviors</p>
                      </div>
                      <Switch
                        checked={mlSettings.predictionsEnabled}
                        onCheckedChange={(checked) =>
                          setMlSettings((prev) => ({ ...prev, predictionsEnabled: checked }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="riskThreshold" className="text-sm font-bold text-slate-700 dark:text-slate-300">Risk Alert Threshold</Label>
                    <Select
                      value={mlSettings.riskThreshold}
                      onValueChange={(value: MLRiskThreshold) =>
                        setMlSettings((prev) => ({ ...prev, riskThreshold: value }))
                      }
                    >
                      <SelectTrigger id="riskThreshold" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical Only</SelectItem>
                        <SelectItem value="high">High & Critical</SelectItem>
                        <SelectItem value="medium">Medium & Above</SelectItem>
                        <SelectItem value="all">All Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="updateFrequency" className="text-sm font-bold text-slate-700 dark:text-slate-300">Prediction Update Frequency</Label>
                    <Select
                      value={mlSettings.updateFrequency}
                      onValueChange={(value: MLUpdateFrequency) =>
                        setMlSettings((prev) => ({ ...prev, updateFrequency: value }))
                      }
                    >
                      <SelectTrigger id="updateFrequency" className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg h-11 focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time (Per Scan)</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">How often ML models are recalculated</p>
                  </div>
                  <div className="bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-700/30 rounded-lg p-4 mt-6">
                    <p className="text-sm text-violet-800 dark:text-violet-300">
                      <span className="font-bold">🤖 AI Insights:</span> Our machine learning models analyze attendance patterns, behavioral events, and risk factors to provide predictive insights. More frequent updates mean better accuracy but may require more system resources.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap justify-end gap-3 pt-6">
                  <Button variant="outline" className="min-w-32 rounded-lg" onClick={() => handleCategoryCancel('ml')}>Cancel</Button>
                  <Button className="min-w-32 bg-linear-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-lg gap-2 shadow-lg hover:shadow-xl transition-all" onClick={handleSaveSettings}>
                    <Save size={16} />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

