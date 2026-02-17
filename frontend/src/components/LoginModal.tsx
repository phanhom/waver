'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { getQRKey, getQRImage, checkQRStatus, getAccountInfo } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [qrKey, setQrKey] = useState<string | null>(null);
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'waiting' | 'scanned' | 'success' | 'expired'>('loading');
    const [message, setMessage] = useState('正在生成二维码...');
    const { user, setUser, setToken } = useAuthStore();

    const fetchQR = async () => {
        setStatus('loading');
        try {
            const { unikey } = await getQRKey();
            const { qrimg } = await getQRImage(unikey);
            setQrKey(unikey);
            setQrImage(qrimg);
            setStatus('waiting');
            setMessage('请使用网易云音乐扫码登录');
        } catch (error) {
            console.error('Failed to fetch QR', error);
            setMessage('Failed to generate QR. Please try again.');
        }
    };

    useEffect(() => {
        // Always fetch QR when component mounts, regardless of isOpen
        fetchQR();
    }, []);

    // Reset QR code when user logs out
    useEffect(() => {
        if (!user && qrKey === null) {
            fetchQR();
        }
    }, [user, qrKey]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (qrKey && (status === 'waiting' || status === 'scanned')) {
            timer = setInterval(async () => {
                try {
                    const res = await checkQRStatus(qrKey);
                    if (res.code === 800) {
                        setStatus('expired');
                        setMessage('二维码已过期，点击刷新');
                        clearInterval(timer);
                    } else if (res.code === 802) {
                        setStatus('scanned');
                        setMessage('扫码成功！请在手机上确认');
                    } else if (res.code === 803) {
                        setStatus('success');
                        setMessage('登录成功！');
                        setToken(res.cookie);
                    
                        // Fetch real user profile
                        try {
                            const accountData = await getAccountInfo(res.cookie);
                            if (accountData.profile) {
                                const userId = accountData.profile.userId || accountData.account?.id;
                                setUser({
                                    userId: String(userId),
                                    nickname: accountData.profile.nickname,
                                    avatarUrl: accountData.profile.avatarUrl
                                });
                            } else {
                                setUser({
                                    userId: 'anonymous',
                                    nickname: 'Netease User',
                                    avatarUrl: ''
                                });
                            }
                        } catch (e) {
                            console.error("Failed to fetch profile", e);
                            setUser({
                                userId: 'anonymous',
                                nickname: 'Netease User',
                                avatarUrl: ''
                            });
                        }
                    
                        clearInterval(timer);
                        // Close the modal and reset state to prevent re-rendering
                        setTimeout(() => {
                            onClose();
                            // Reset QR state to prevent re-use of expired QR codes
                            setQrKey(null);
                            setQrImage(null);
                        }, 1500);
                    }
                } catch (error) {
                }
            }, 2000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [qrKey, status, onClose]);

    // Remove the isOpen check to always render when used on login page
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-sm bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center text-center backdrop-blur-xl"
                >

                    <div className="relative w-52 h-52 bg-white border border-black/5 rounded-3xl p-4 group font-bold">
                        {status === 'loading' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="animate-spin text-black" size={32} />
                            </div>
                        )}

                        {qrImage && (status === 'waiting' || status === 'scanned') && (
                            <img src={qrImage} alt="Netease Login QR" className={`w-full h-full object-contain ${status === 'scanned' ? 'opacity-10 blur-xl' : ''}`} />
                        )}

                        {status === 'scanned' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
                                <CheckCircle2 size={56} strokeWidth={1.5} className="mb-3" />
                                <span className="font-bold text-xs tracking-widest uppercase">Confirmed</span>
                            </div>
                        )}

                        {status === 'expired' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/95 cursor-pointer" onClick={fetchQR}>
                                <div className="text-black font-black text-xs flex flex-col items-center tracking-widest uppercase">
                                    <div className="mb-2 opacity-30">Expired</div>
                                    <div className="border-b border-black">Refresh</div>
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
                                <CheckCircle2 size={56} strokeWidth={1.5} className="mb-3" />
                                <span className="font-black text-lg tracking-tight uppercase">Authorized</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
