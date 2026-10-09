import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { attendanceApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ScanLine,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Keyboard,
  UploadCloud,
  QrCode,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

export default function ScanQRPage() {
  const [state, setState] = useState<ScanState>('idle');
  const [message, setMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
  }, []);

  const handleMarkWithData = useCallback(async (payload: string) => {
    setState('processing');
    await stopScanner();
    try {
      const response = await attendanceApi.markAttendance(payload);
      setState('success');
      setMessage(response.data.message || 'Attendance marked successfully!');
      toast.success('Attendance marked! ✅');
    } catch (err: unknown) {
      setState('error');
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const errorMsg = axiosErr?.response?.data?.message || 'Failed to mark attendance';
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  }, [stopScanner]);

  const startScanner = () => {
    setState('scanning');
  };

  // Mount scanner after React finishes DOM rendering of #qr-reader
  useEffect(() => {
    if (state !== 'scanning') return;

    let isMounted = true;
    let localScanner: Html5Qrcode | null = null;

    const initCamera = async () => {
      try {
        localScanner = new Html5Qrcode('qr-reader');
        scannerRef.current = localScanner;

        // Try environment (back) camera first
        try {
          await localScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
              if (isMounted) await handleMarkWithData(decodedText);
            },
            () => {}
          );
        } catch (backCamErr: any) {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0 && devices[0]?.id) {
            const cameraId = devices[0].id;
            await localScanner.start(
              cameraId,
              { fps: 10, qrbox: { width: 250, height: 250 } },
              async (decodedText) => {
                if (isMounted) await handleMarkWithData(decodedText);
              },
              () => {}
            );
          } else {
            throw backCamErr;
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera startup error:', err);
        setState('error');
        const errString = String(err?.name || err?.message || err || '');
        if (errString.includes('NotAllowedError') || errString.includes('Permission')) {
          setMessage('Camera permission was denied in your browser. Please click the Lock/Camera icon in your address bar and select "Allow Camera".');
          toast.error('Camera permission denied. Allow camera in browser.');
        } else if (errString.includes('NotFoundError') || errString.includes('DevicesNotFoundError')) {
          setMessage('No webcam or camera hardware was detected on this device. You can use the "Manual Code Entry" or "Upload Image" tab below!');
          toast.info('No webcam detected on this device');
        } else {
          setMessage(err?.message || 'Could not access the camera. You can use the "Manual Code Entry" or "Upload Image" tab below to mark attendance!');
          toast.error('Camera unavailable');
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (localScanner && localScanner.isScanning) {
        localScanner.stop().catch(() => {});
      }
    };
  }, [state, handleMarkWithData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState('processing');
    try {
      const html5QrCode = new Html5Qrcode('qr-file-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      await handleMarkWithData(decodedText);
    } catch (err) {
      setState('error');
      setMessage('Could not detect a valid QR code in this image. Please try again or enter the code manually.');
      toast.error('QR code not found in image');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error('Please enter the Lecture ID or Token');
      return;
    }
    await handleMarkWithData(manualCode.trim());
  };

  const reset = async () => {
    await stopScanner();
    setState('idle');
    setMessage('');
    setManualCode('');
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border shadow-xl overflow-hidden bg-card">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Mark Attendance</h2>
                <p className="text-blue-100 text-xs">Scan QR, enter session code, or upload image</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {state === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Tabs defaultValue="camera" className="w-full">
                    <TabsList className="grid grid-cols-3 mb-6">
                      <TabsTrigger value="camera" className="text-xs">
                        <Camera className="w-3.5 h-3.5 mr-1" /> Camera
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="text-xs">
                        <Keyboard className="w-3.5 h-3.5 mr-1" /> Manual Code
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="text-xs">
                        <UploadCloud className="w-3.5 h-3.5 mr-1" /> Upload
                      </TabsTrigger>
                    </TabsList>

                    {/* Camera Tab */}
                    <TabsContent value="camera" className="text-center py-4 space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center ring-2 ring-primary/10">
                        <Camera className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Scan Dynamic QR Code</p>
                        <p className="text-xs text-muted-foreground mt-1">Point your camera at the teacher's screen</p>
                      </div>
                      <Button
                        onClick={startScanner}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 rounded-xl py-5"
                      >
                        <Camera className="mr-2 h-4 w-4" /> Start Camera Scanner
                      </Button>
                    </TabsContent>

                    {/* Manual Code Entry Tab */}
                    <TabsContent value="manual" className="py-2 space-y-4">
                      <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="lectureCode" className="text-xs font-semibold">
                            Lecture Code / QR Token
                          </Label>
                          <Input
                            id="lectureCode"
                            placeholder="Paste Lecture ID or QR payload here..."
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Ideal for testing on desktop or if your camera is unavailable.
                          </p>
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 rounded-xl py-5 font-semibold"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Attendance
                        </Button>
                      </form>
                    </TabsContent>

                    {/* File Upload Tab */}
                    <TabsContent value="upload" className="text-center py-4 space-y-4">
                      <div id="qr-file-reader" className="hidden" />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-8 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-secondary/40 transition-colors flex flex-col items-center justify-center gap-2"
                      >
                        <UploadCloud className="w-10 h-10 text-muted-foreground" />
                        <p className="text-xs font-semibold text-foreground">Click to upload QR image</p>
                        <p className="text-[10px] text-muted-foreground">PNG, JPG, or screenshot</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {state === 'scanning' && (
                <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div id="qr-reader" className="rounded-2xl overflow-hidden ring-2 ring-primary/20" />
                  <p className="text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Scanning for QR code...
                  </p>
                  <Button variant="outline" onClick={reset} className="w-full rounded-xl">
                    <CameraOff className="mr-2 h-4 w-4" /> Cancel Camera
                  </Button>
                </motion.div>
              )}

              {state === 'processing' && (
                <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <Loader2 className="w-14 h-14 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-foreground font-semibold text-sm">Validating session...</p>
                  <p className="text-xs text-muted-foreground mt-1">Recording your attendance in database</p>
                </motion.div>
              )}

              {state === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 ring-4 ring-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">Attendance Marked!</h3>
                  <p className="text-muted-foreground text-xs mb-6">{message}</p>
                  <Button onClick={reset} variant="outline" className="rounded-xl w-full">
                    Done
                  </Button>
                </motion.div>
              )}

              {state === 'error' && (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4 ring-4 ring-red-500/20">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">Attendance Failed</h3>
                  <p className="text-muted-foreground text-xs mb-6">{message}</p>
                  <Button onClick={reset} className="rounded-xl w-full">
                    Try Another Method
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
