import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, uploadApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Lock,
  Save,
  Loader2,
  ShieldAlert,
  Camera,
  Upload,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await authApi.getProfile();
      return res.data.data;
    },
  });

  const currentUser = profileData?.user || user;
  const profile = profileData?.profile as any;

  // Form states for editable fields
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [address, setAddress] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState<number | string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setPhotoURL(currentUser.photoURL || '');
    }
    if (profile) {
      if (currentUser?.role === 'student') {
        setAddress(profile.address || '');
        setParentPhone(profile.parentPhone || '');
        setCareerGoal(profile.careerGoal || '');
      } else if (currentUser?.role === 'teacher') {
        setSpecialization(profile.specialization || '');
        setQualification(profile.qualification || '');
        setExperience(profile.experience || '');
      }
    }
  }, [currentUser, profile]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      toast.info('Uploading photo to Cloudinary...');
      const res = await uploadApi.uploadAvatar(file);
      const uploadedUrl = res.data?.data?.url || (res.data as any)?.url;

      if (!uploadedUrl) {
        throw new Error(res.data?.message || (res.data as any)?.error || 'No URL returned from Cloudinary upload');
      }

      setPhotoURL(uploadedUrl);
      // Automatically save new avatar URL to user profile in database
      await authApi.updateProfile({ photoURL: uploadedUrl });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('🎉 Profile photo updated successfully!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to upload photo to Cloudinary';
      toast.error(errorMessage);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      phone,
      photoURL,
    };

    if (currentUser?.role === 'student') {
      payload.address = address;
      payload.parentPhone = parentPhone;
      payload.careerGoal = careerGoal;
    } else if (currentUser?.role === 'teacher') {
      payload.specialization = specialization;
      payload.qualification = qualification;
      payload.experience = experience ? Number(experience) : null;
    }

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleBadgeColor = {
    student: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    teacher: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  }[currentUser?.role || 'student'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and preferences</p>
      </div>

      {/* Official Identity Alert Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-semibold text-amber-700 dark:text-amber-400">Official Identity Fields:</span> Name, Roll Number / Employee ID, and Department are verified institutional credentials. If you require a correction, please contact your university administrator.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="border shadow-lg text-center p-6 bg-card">
            <div className="flex flex-col items-center">
              {/* Cloudinary Avatar Upload Container */}
              <div className="relative group mb-4">
                <Avatar className="w-24 h-24 ring-4 ring-primary/20 shadow-xl">
                  <AvatarImage src={photoURL || currentUser?.photoURL} alt={currentUser?.displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-2xl font-bold">
                    {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  disabled={isUploadingAvatar}
                />

                {/* Interactive Camera Badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Upload new profile photo to Cloudinary"
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-background cursor-pointer disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-1.5">
                {currentUser?.displayName}
              </h2>
              <p className="text-xs text-muted-foreground mb-3">{currentUser?.email}</p>

              <Badge variant="outline" className={`capitalize font-medium ${roleBadgeColor}`}>
                {currentUser?.role}
              </Badge>

              <div className="w-full border-t border-border mt-5 pt-4 text-left space-y-2.5 text-xs text-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-semibold text-foreground">{currentUser?.department || 'N/A'}</span>
                </div>
                {currentUser?.role === 'student' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Semester</span>
                      <span className="font-semibold text-foreground">Sem {currentUser?.semester || profile?.semester || 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Division</span>
                      <span className="font-semibold text-foreground">{currentUser?.division || profile?.division || 'A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Roll No</span>
                      <span className="font-semibold text-foreground">{currentUser?.rollNumber || profile?.rollNumber || 'N/A'}</span>
                    </div>
                  </>
                )}
                {currentUser?.role === 'teacher' && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Employee ID</span>
                    <span className="font-semibold text-foreground">{profile?.employeeId || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Right Column: Editable Details Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="md:col-span-2">
          <Card className="border shadow-lg bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground font-bold">Profile Details</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Update your contact info and personal academic details
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                {/* Official (Locked) Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/40 border border-border">
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-500" /> Full Name (Official)
                    </Label>
                    <Input
                      value={currentUser?.displayName || ''}
                      disabled
                      className="bg-background/80 border-border text-foreground font-medium cursor-not-allowed mt-1.5"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-500" /> Email (Primary)
                    </Label>
                    <Input
                      value={currentUser?.email || ''}
                      disabled
                      className="bg-background/80 border-border text-foreground font-medium cursor-not-allowed mt-1.5"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-500" /> Department
                    </Label>
                    <Input
                      value={currentUser?.department || 'General'}
                      disabled
                      className="bg-background/80 border-border text-foreground font-medium cursor-not-allowed mt-1.5"
                    />
                  </div>

                  {currentUser?.role === 'student' ? (
                    <div>
                      <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-500" /> Roll Number
                      </Label>
                      <Input
                        value={currentUser?.rollNumber || profile?.rollNumber || ''}
                        disabled
                        className="bg-background/80 border-border text-foreground font-medium cursor-not-allowed mt-1.5"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-500" /> Employee ID
                      </Label>
                      <Input
                        value={profile?.employeeId || ''}
                        disabled
                        className="bg-background/80 border-border text-foreground font-medium cursor-not-allowed mt-1.5"
                      />
                    </div>
                  )}
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-xs text-foreground font-medium">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="photo" className="text-xs text-foreground font-medium">Profile Photo URL</Label>
                    <Input
                      id="photo"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Role Specific Fields */}
                {currentUser?.role === 'student' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="parentPhone" className="text-xs text-foreground font-medium">Parent / Guardian Phone</Label>
                        <Input
                          id="parentPhone"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="careerGoal" className="text-xs text-foreground font-medium">Career Goal / Target Role</Label>
                        <Input
                          id="careerGoal"
                          value={careerGoal}
                          onChange={(e) => setCareerGoal(e.target.value)}
                          placeholder="e.g. AI Research Scientist / Full-Stack Engineer"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-xs text-foreground font-medium">Residential Address</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, City, State"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                {currentUser?.role === 'teacher' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="specialization" className="text-xs text-foreground font-medium">Specialization</Label>
                      <Input
                        id="specialization"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Machine Learning"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="qualification" className="text-xs text-foreground font-medium">Qualification</Label>
                      <Input
                        id="qualification"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. Ph.D. / M.Tech"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="experience" className="text-xs text-foreground font-medium">Experience (Years)</Label>
                      <Input
                        id="experience"
                        type="number"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="e.g. 5"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end pt-3">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
