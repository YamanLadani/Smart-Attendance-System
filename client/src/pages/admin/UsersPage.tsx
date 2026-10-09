import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Users, Search, Trash2, AlertTriangle, UserPlus, Edit, Key, Shield, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { User } from '@/types';

const DEPARTMENTS = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  // Dialog states
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states for Add User
  const [addForm, setAddForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
    department: 'Computer Science',
    semester: '1',
    division: 'A',
    rollNumber: '',
    phone: '',
    employeeId: '',
    designation: 'Assistant Professor',
  });

  // Form state for Reset Password
  const [newPassword, setNewPassword] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, deptFilter, semFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (roleFilter && roleFilter !== 'all') params.role = roleFilter;
      if (deptFilter && deptFilter !== 'all') params.department = deptFilter;
      if (semFilter && semFilter !== 'all') params.semester = semFilter;
      return adminApi.getUsers(params).then((r) => r.data.data);
    },
  });

  // Status toggle mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteTarget(null);
      toast.success('User deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  // Create User mutation
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsAddOpen(false);
      setAddForm({
        displayName: '',
        email: '',
        password: '',
        role: 'student',
        department: 'Computer Science',
        semester: '1',
        division: 'A',
        rollNumber: '',
        phone: '',
        employeeId: '',
        designation: 'Assistant Professor',
      });
      toast.success('User created successfully! 🎉');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  // Update User mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditTarget(null);
      toast.success('User profile updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update user'),
  });

  // Reset Password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      adminApi.resetUserPassword(id, newPassword),
    onSuccess: () => {
      setPasswordTarget(null);
      setNewPassword('');
      toast.success('Password reset successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reset password'),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.displayName || !addForm.email || !addForm.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    createMutation.mutate({
      ...addForm,
      semester: addForm.semester ? parseInt(addForm.semester, 10) : undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        displayName: editTarget.displayName,
        department: editTarget.department,
        semester: editTarget.semester,
        division: editTarget.division,
        rollNumber: editTarget.rollNumber,
        phone: editTarget.phone,
      },
    });
  };

  const roleColor = (role: string) => {
    if (role === 'teacher') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (role === 'admin') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Management ({(data?.pagination as any)?.total ?? data?.users?.length ?? 0})
          </CardTitle>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white gap-2 shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, roll..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={semFilter} onValueChange={setSemFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5].map((s) => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Sem / Div / Roll</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users && data.users.length > 0 ? (
                    data.users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{user.displayName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize font-medium ${roleColor(user.role)}`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{user.department || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.role === 'student' ? (
                            <span>Sem {user.semester || '—'} | Div {user.division || '—'} | #{user.rollNumber || '—'}</span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.createdAt), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) =>
                              statusMutation.mutate({ id: user.id, isActive: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit user profile"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditTarget(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reset password"
                              className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                              onClick={() => setPasswordTarget(user)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete user"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No users match the search criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account with direct access credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="Dr. John Doe"
                value={addForm.displayName}
                onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="user@college.edu"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Password *</Label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(val: any) => setAddForm({ ...addForm, role: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select
                  value={addForm.department}
                  onValueChange={(val) => setAddForm({ ...addForm, department: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {addForm.role === 'student' && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="space-y-1.5">
                  <Label>Semester</Label>
                  <Select
                    value={addForm.semester}
                    onValueChange={(val) => setAddForm({ ...addForm, semester: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Division</Label>
                  <Select
                    value={addForm.division}
                    onValueChange={(val) => setAddForm({ ...addForm, division: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D'].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Roll No.</Label>
                  <Input
                    placeholder="01"
                    value={addForm.rollNumber}
                    onChange={(e) => setAddForm({ ...addForm, rollNumber: e.target.value })}
                  />
                </div>
              </div>
            )}

            {addForm.role === 'teacher' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Employee ID</Label>
                  <Input
                    placeholder="EMP001"
                    value={addForm.employeeId}
                    onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Designation</Label>
                  <Select
                    value={addForm.designation}
                    onValueChange={(val) => setAddForm({ ...addForm, designation: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'HOD'].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" /> Edit User Profile
            </DialogTitle>
            <DialogDescription>
              Modify user identity and enrollment information.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editTarget.displayName}
                  onChange={(e) => setEditTarget({ ...editTarget, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={editTarget.department || ''}
                  onValueChange={(val) => setEditTarget({ ...editTarget, department: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editTarget.role === 'student' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label>Semester</Label>
                    <Select
                      value={String(editTarget.semester || '1')}
                      onValueChange={(val) => setEditTarget({ ...editTarget, semester: parseInt(val, 10) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Division</Label>
                    <Select
                      value={editTarget.division || 'A'}
                      onValueChange={(val) => setEditTarget({ ...editTarget, division: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['A', 'B', 'C', 'D'].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Roll No.</Label>
                    <Input
                      value={editTarget.rollNumber || ''}
                      onChange={(e) => setEditTarget({ ...editTarget, rollNumber: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  value={editTarget.phone || ''}
                  onChange={(e) => setEditTarget({ ...editTarget, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!passwordTarget} onOpenChange={() => { setPasswordTarget(null); setNewPassword(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <Key className="w-5 h-5" /> Reset User Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{passwordTarget?.displayName}</strong> ({passwordTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              onClick={() => passwordTarget && resetPasswordMutation.mutate({ id: passwordTarget.id, newPassword })}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resetPasswordMutation.isPending ? 'Updating...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.displayName}</strong> ({deleteTarget?.email})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
