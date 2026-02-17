'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, QrCode, Send, LogIn, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { getQRKey, getQRImage, checkQRStatus, getAccountInfo, getUserDetail, loginWithPhone, sendCaptcha, loginWithCaptcha } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginSection() {
    const [loginMethod, setLoginMethod] = useState<'qr' | 'phone'>('phone');
    // QR Code states
    const [qrKey, setQrKey] = useState<string | null>(null);
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [qrStatus, setQrStatus] = useState<'loading' | 'waiting' | 'scanned' | 'success' | 'expired'>('loading');
    const [qrMessage, setQrMessage] = useState('请使用网易云音乐扫码登录');

    // Phone login states
    const [phone, setPhone] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [isSendingCaptcha, setIsSendingCaptcha] = useState(false);
    const [captchaSent, setCaptchaSent] = useState(false);
    const [phoneLoginStatus, setPhoneLoginStatus] = useState<'idle' | 'sending' | 'sent' | 'logging' | 'success' | 'error'>('idle');
    const [phoneLoginMessage, setPhoneLoginMessage] = useState('');

    const { setUser, setToken } = useAuthStore();

    // QR Code functions
    const fetchQR = async () => {
        setQrStatus('loading');
        setQrMessage('正在生成二维码...');
        try {
            const { unikey } = await getQRKey();
            const { qrimg } = await getQRImage(unikey);
            setQrKey(unikey);
            setQrImage(qrimg);
            setQrStatus('waiting');
            setQrMessage('请使用网易云音乐扫码登录');
        } catch (error) {
            setQrMessage('生成二维码失败，请重试');
        }
    };

    useEffect(() => {
        if (loginMethod === 'qr') {
            fetchQR();
        }
    }, [loginMethod]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (qrKey && (qrStatus === 'waiting' || qrStatus === 'scanned')) {
            timer = setInterval(async () => {
                try {
                    const res = await checkQRStatus(qrKey);

                    if (res.code === 800) {
                        setQrStatus('expired');
                        setQrMessage('二维码已过期，点击刷新');
                    } else if (res.code === 802) {
                        setQrStatus('scanned');
                        setQrMessage('扫码成功！请在手机上确认');
                    } else if (res.code === 803) {
                        setQrStatus('success');
                        setQrMessage('登录成功！正在跳转...');
                        setToken(res.cookie);

                        // 获取用户信息
                        try {
                            const accountData = await getAccountInfo(res.cookie);
                            const userId = accountData.profile?.userId || accountData.account?.id;
                            const userData = accountData.profile
                                ? {
                                      userId: String(userId),
                                      nickname: accountData.profile.nickname,
                                      avatarUrl: accountData.profile.avatarUrl,
                                  }
                                : {
                                      userId: String(userId || 'anonymous'),
                                      nickname: '网易云用户',
                                      avatarUrl: '',
                                  };

                            setUser(userData);
                            window.dispatchEvent(new CustomEvent('login-success', { detail: userData }));

                            if (!accountData.profile && userId) {
                                try {
                                    const detail = await getUserDetail(String(userId), res.cookie);
                                    if (detail?.profile?.userId) {
                                        const refinedUserData = {
                                            userId: String(detail.profile.userId),
                                            nickname: detail.profile.nickname,
                                            avatarUrl: detail.profile.avatarUrl
                                        };
                                        setUser(refinedUserData);
                                        window.dispatchEvent(new CustomEvent('login-success', { detail: refinedUserData }));
                                    }
                                } catch {
                                }
                            }
                        } catch {
                            const userData = {
                                userId: 'anonymous',
                                nickname: '网易云用户',
                                avatarUrl: ''
                            };
                            setUser(userData);
                            window.dispatchEvent(new CustomEvent('login-success', { detail: userData }));

                            // 登录成功后刷新页面以更新UI
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500); // 与提示信息显示时间一致
                        }
                    }
                } catch (error) {
                    setQrMessage('网络连接失败');
                    setQrStatus('expired');
                }
            }, 3000); // 增加检查间隔到3秒
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [qrKey, qrStatus]);

    // Phone login functions
    const handleSendCaptcha = async () => {
        if (!phone.trim()) {
            setPhoneLoginMessage('请输入手机号');
            return;
        }

        setIsSendingCaptcha(true);
        setPhoneLoginStatus('sending');
        setPhoneLoginMessage('正在发送验证码...');

        try {
            const res = await sendCaptcha(phone);
            if (res.code === 200) {
                setPhoneLoginStatus('sent');
                setPhoneLoginMessage('验证码已发送，请查收短信');
                setCaptchaSent(true);
            } else {
                setPhoneLoginStatus('error');
                setPhoneLoginMessage(res.message || '发送验证码失败');
            }
        } catch (error) {
            setPhoneLoginStatus('error');
            setPhoneLoginMessage('发送验证码失败，请检查网络连接');
            console.error('Failed to send captcha', error);
        } finally {
            setIsSendingCaptcha(false);
        }
    };

    const handlePhoneLogin = async () => {
        if (!phone.trim()) {
            setPhoneLoginMessage('请输入手机号');
            return;
        }

        if (!captcha.trim()) {
            setPhoneLoginMessage('请输入验证码');
            return;
        }

        setPhoneLoginStatus('logging');
        setPhoneLoginMessage('正在登录...');

        try {
            const res = await loginWithCaptcha(phone, captcha);

            if (res.code === 200) {
                setPhoneLoginStatus('success');
                setPhoneLoginMessage('登录成功！正在跳转...');
                setToken(res.cookie);

                // 获取用户信息
                try {
                    const accountData = await getAccountInfo(res.cookie);
                    const userId = accountData.profile?.userId || accountData.account?.id;
                    const userData = accountData.profile
                        ? {
                              userId: String(userId),
                              nickname: accountData.profile.nickname,
                              avatarUrl: accountData.profile.avatarUrl,
                          }
                        : {
                              userId: String(userId || 'anonymous'),
                              nickname: '网易云用户',
                              avatarUrl: '',
                          };

                    setUser(userData);
                    window.dispatchEvent(new CustomEvent('login-success', { detail: userData }));

                    if (!accountData.profile && userId) {
                        try {
                            const detail = await getUserDetail(String(userId), res.cookie);
                            if (detail?.profile?.userId) {
                                const refinedUserData = {
                                    userId: String(detail.profile.userId),
                                    nickname: detail.profile.nickname,
                                    avatarUrl: detail.profile.avatarUrl
                                };
                                setUser(refinedUserData);
                                window.dispatchEvent(new CustomEvent('login-success', { detail: refinedUserData }));
                            }
                        } catch {
                        }
                    }
                } catch {
                    const userData = {
                        userId: 'anonymous',
                        nickname: '网易云用户',
                        avatarUrl: ''
                    };
                    setUser(userData);
                    window.dispatchEvent(new CustomEvent('login-success', { detail: userData }));
                }

                // 登录成功后刷新页面以更新UI
                setTimeout(() => {
                    window.location.reload();
                }, 1500); // 与提示信息显示时间一致
            } else {
                setPhoneLoginStatus('error');
                setPhoneLoginMessage(res.message || '登录失败，请检查账号密码');
            }
        } catch (error) {
            setPhoneLoginStatus('error');
            setPhoneLoginMessage('登录失败，请检查网络连接');
            console.error('Login failed', error);
        }
    };

    const resetPhoneForm = () => {
        setPhone('');
        setCaptcha('');
        setCaptchaSent(false);
        setPhoneLoginStatus('idle');
        setPhoneLoginMessage('');
    };


    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mb-12 select-none"
            >
                <img 
                    src="/logo.webp" 
                    alt="WAVER" 
                    className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                />
            </motion.div>
            <div className="flex gap-2 mb-8 p-1 bg-black/5 dark:bg-white/5 rounded-full backdrop-blur-sm">
                <button
                    onClick={() => setLoginMethod('qr')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                        loginMethod === 'qr'
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                    }`}
                >
                    <QrCode size={16} />
                    扫码
                </button>
                <button
                    onClick={() => setLoginMethod('phone')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                        loginMethod === 'phone'
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                    }`}
                >
                    <Smartphone size={16} />
                    手机号
                </button>
            </div>

            {/* Login Content */}
            <AnimatePresence mode="wait">
                {loginMethod === 'qr' ? (
                    <motion.div
                        key="qr"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-xs"
                    >
                        <div className="bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-xl h-[320px] flex flex-col items-center justify-center">
                            <p className="text-sm font-medium text-black/60 dark:text-white/60 mb-4">请使用网易云音乐扫码登录</p>
                            <div className="relative w-56 h-56 bg-white dark:bg-gray-900 rounded-2xl p-3">
                                {qrStatus === 'loading' && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-black/40 dark:text-white/40" size={32} />
                                    </div>
                                )}

                                {qrImage && (qrStatus === 'waiting' || qrStatus === 'scanned') && (
                                    <>
                                        <img
                                            src={qrImage}
                                            alt="QR Code"
                                            className={`w-full h-full object-contain rounded-xl transition-all ${qrStatus === 'scanned' ? 'opacity-20 blur-sm' : ''}`}
                                        />
                                        {qrStatus === 'scanned' && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <CheckCircle2 className="text-black dark:text-white" size={56} strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </>
                                )}

                                {qrStatus === 'expired' && (
                                    <div
                                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors"
                                        onClick={fetchQR}
                                    >
                                        <RefreshCw className="text-black/40 dark:text-white/40 mb-3" size={32} />
                                        <p className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">点击刷新</p>
                                    </div>
                                )}

                                {qrStatus === 'success' && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <CheckCircle2 className="text-black dark:text-white" size={56} strokeWidth={1.5} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="phone"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-xs"
                    >
                        <div className="bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-xl h-[320px] flex flex-col items-center justify-center">
                            <p className="text-sm font-medium text-black/60 dark:text-white/60 mb-4">登录网易云音乐账号</p>
                            <div className="space-y-3 w-full">
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="手机号"
                                    className="w-full px-4 py-3 border border-black/10 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-black/50 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-all text-sm font-medium"
                                />

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={captcha}
                                        onChange={(e) => setCaptcha(e.target.value)}
                                        placeholder="验证码"
                                        className="flex-1 px-4 py-3 border border-black/10 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-black/50 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-all text-sm font-medium"
                                    />
                                    <button
                                        onClick={handleSendCaptcha}
                                        disabled={isSendingCaptcha || !phone.trim()}
                                        className="px-4 py-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                    >
                                        {isSendingCaptcha ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : captchaSent ? (
                                            '重发'
                                        ) : (
                                            '获取'
                                        )}
                                    </button>
                                </div>

                                <button
                                    onClick={handlePhoneLogin}
                                    disabled={phoneLoginStatus === 'logging' || !phone.trim() || !captcha.trim()}
                                    className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm uppercase tracking-wider hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {phoneLoginStatus === 'logging' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        '登录'
                                    )}
                                </button>

                                {phoneLoginMessage && phoneLoginStatus === 'error' && (
                                    <p className="text-center text-xs text-red-500 dark:text-red-400 font-medium">
                                        {phoneLoginMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

