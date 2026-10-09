import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { motion } from 'framer-motion';

const defaultSettings = [
  { key: 'min_attendance_percent', label: 'Minimum Attendance %', description: 'Students below this % get low-attendance alerts', category: 'attendance', defaultValue: '75' },
  { key: 'qr_expiry_seconds', label: 'QR Code Expiry (seconds)', description: 'How long a generated QR code stays valid', category: 'attendance', defaultValue: '30' },
  { key: 'institution_name', label: 'Institution Name', description: 'Displayed across the system', category: 'general', defaultValue: 'Smart Attendance Institute' },
  { key: 'academic_year', label: 'Academic Year', description: 'Current academic year', category: 'general', defaultValue: '2025-26' },
  { key: 'max_late_minutes', label: 'Late Threshold (minutes)', description: 'Minutes after class start to mark as late', category: 'attendance', defaultValue: '10' },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await adminApi.getSettings();
      const settingsArr = (res.data.data?.settings || []) as { key: string; value: unknown }[];
      const map: Record<string, string> = {};
      for (const s of settingsArr) {
        map[s.key] = String(s.value ?? '');
      }
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (setting: { key: string; value: string; description?: string; category?: string }) =>
      adminApi.updateSetting(setting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Setting saved');
    },
    onError: () => toast.error('Failed to save setting'),
  });

  const getValue = (key: string, defaultValue: string) => {
    if (values[key] !== undefined) return values[key];
    if (data?.[key] !== undefined) return data[key];
    return defaultValue;
  };

  const handleSave = (setting: typeof defaultSettings[0]) => {
    saveMutation.mutate({
      key: setting.key,
      value: getValue(setting.key, setting.defaultValue),
      description: setting.description,
      category: setting.category,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  // Group by category
  const categories = [...new Set(defaultSettings.map((s) => s.category))];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">System Settings</h1>
      </div>

      {categories.map((category) => (
        <Card key={category} className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg capitalize">{category} Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {defaultSettings
              .filter((s) => s.category === category)
              .map((setting, idx, arr) => (
                <div key={setting.key}>
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>{setting.label}</Label>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                      <Input
                        value={getValue(setting.key, setting.defaultValue)}
                        onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(setting)}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><Save className="mr-1 h-3 w-3" /> Save</>
                      )}
                    </Button>
                  </div>
                  {idx < arr.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
