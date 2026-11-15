"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiClient, ApiError } from "@/lib/api/client";
import { APP_NAME } from "@/lib/config/app";
import { Loader2, ShieldCheck, Smartphone, Mail, GraduationCap, Bus, UserCog, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Mode = "password" | "otp" | "gmail";
type OtpStage = "request" | "verify";
type RoleChoice = "STUDENT" | "DRIVER" | "ADMIN";

const ROLES: Array<{ id: RoleChoice; label: string; icon: React.ReactNode; desc: string }> = [
  { id: "STUDENT", label: "Student", icon: <GraduationCap className="size-5" />, desc: "Book trips & track" },
  { id: "DRIVER", label: "Driver", icon: <Bus className="size-5" />, desc: "Broadcast bus GPS" },
  { id: "ADMIN", label: "Admin", icon: <UserCog className="size-5" />, desc: "Manage everything" },
];

export function SignInSheet({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn?: (user: any) => void;
}) {
  const [mode, setMode] = useState<Mode>("password");
  const [otpStage, setOtpStage] = useState<OtpStage>("request");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailStage, setEmailStage] = useState<OtpStage>("request");
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleChoice | null>(null);

  useEffect(() => {
    if (open) {
      setMode("password");
      setOtpStage("request");
      setPhone("");
      setPassword("");
      setCode("");
      setDevCode(null);
      setEmail("");
      setEmailStage("request");
      setEmailDevCode(null);
    }
  }, [open]);

  const loginMut = useMutation({
    mutationFn: () =>
      apiClient.auth.login({ phone, password, expectedRole: selectedRole ?? undefined }),
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.user.name}`);
      onSignedIn?.(data.user);
      onClose();
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Login failed");
    },
  });

  const otpRequestMut = useMutation({
    mutationFn: () => apiClient.auth.otpRequest({ phone, purpose: "login" }),
    onSuccess: (data) => {
      setDevCode(data.devCode ?? null);
      setOtpStage("verify");
      toast.success("Code sent");
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Could not send code");
    },
  });

  const otpVerifyMut = useMutation({
    mutationFn: () => apiClient.auth.otpVerify({ phone, code, purpose: "login" }),
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.user.name}`);
      onSignedIn?.(data.user);
      onClose();
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Verification failed");
    },
  });

  // Gmail (email OTP) sign-in
  const emailRequestMut = useMutation({
    mutationFn: () => apiClient.auth.emailOtpRequest({ email }),
    onSuccess: (data) => {
      setEmailDevCode(data.devCode ?? null);
      setEmailStage("verify");
      toast.success("Code sent to your email", {
        description: data.devCode ? `Dev code: ${data.devCode}` : "Check your inbox.",
      });
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Could not send code");
    },
  });

  const emailVerifyMut = useMutation({
    mutationFn: () => apiClient.auth.emailOtpVerify({ email, code }),
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.user.name}`);
      onSignedIn?.(data.user);
      onClose();
    },
    onError: (e: any) => {
      toast.error(e instanceof ApiError ? e.message : "Verification failed");
    },
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Sign in to {APP_NAME}
        </span>
      }
      description="Book a seat, track your bus, arrive safe."
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {/* Role selector — user chooses who they are before signing in */}
        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div
              key="role-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
                I am signing in as…
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLES.map((r) => (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(r.id)}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-grad-primary text-white shadow-sm transition-transform group-hover:scale-105">
                      {r.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{r.label}</div>
                      <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Your account must match the role you pick.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* chosen role banner */}
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  {ROLES.find((r) => r.id === selectedRole)?.icon}
                  <span className="text-sm font-semibold">
                    {ROLES.find((r) => r.id === selectedRole)?.label}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedRole(null); setMode("password"); }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Change role
                </button>
              </div>

        <div className="relative inline-flex w-full rounded-full border border-border bg-card p-1">
          {(["password", "otp", "gmail"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "relative flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                mode === m
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === m && (
                <motion.span
                  layoutId="signin-tab"
                  className="absolute inset-0 rounded-full bg-grad-primary"
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1">
                {m === "password" ? "Password" : m === "otp" ? "Phone OTP" : "Gmail"}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === "password" && (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                loginMut.mutate();
              }}
            >
              <div>
                <Label htmlFor="si-phone">Phone</Label>
                <Input
                  id="si-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0240000001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="si-pass">Password</Label>
                <Input
                  id="si-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-grad-primary"
                disabled={loginMut.isPending}
              >
                {loginMut.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                Sign in
              </Button>
            </motion.form>
          )}
          {mode === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="si-otp-phone">Phone</Label>
                <Input
                  id="si-otp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0240000001"
                  disabled={otpStage === "verify"}
                />
              </div>
              {otpStage === "verify" && (
                <div>
                  <Label htmlFor="si-otp-code">Enter code</Label>
                  <InputOTP
                    id="si-otp-code"
                    maxLength={6}
                    value={code}
                    onChange={(v) => setCode(v)}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {devCode && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      <Smartphone className="mr-1 inline-block h-3 w-3" />
                      Dev code: <code className="font-mono">{devCode}</code>
                    </p>
                  )}
                </div>
              )}
              {otpStage === "request" ? (
                <Button
                  onClick={() => otpRequestMut.mutate()}
                  disabled={otpRequestMut.isPending || !phone}
                  className="w-full bg-grad-primary"
                >
                  {otpRequestMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Send code
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOtpStage("request")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => otpVerifyMut.mutate()}
                    disabled={otpVerifyMut.isPending || code.length !== 6}
                    className="flex-1 bg-grad-primary"
                  >
                    {otpVerifyMut.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : null}
                    Verify
                  </Button>
                </div>
              )}
            </motion.div>
          )}
          {mode === "gmail" && (
            <motion.div
              key="gmail"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="si-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="si-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="pl-9"
                    disabled={emailStage === "verify"}
                  />
                </div>
              </div>
              {emailStage === "verify" && (
                <div>
                  <Label htmlFor="si-email-code">Enter the code sent to your email</Label>
                  <InputOTP
                    id="si-email-code"
                    maxLength={6}
                    value={code}
                    onChange={(v) => setCode(v)}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {emailDevCode && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      <Mail className="mr-1 inline-block h-3 w-3" />
                      Dev code: <code className="font-mono">{emailDevCode}</code>
                    </p>
                  )}
                </div>
              )}
              {emailStage === "request" ? (
                <Button
                  onClick={() => emailRequestMut.mutate()}
                  disabled={emailRequestMut.isPending || !email}
                  className="w-full bg-grad-primary"
                >
                  {emailRequestMut.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-1 h-4 w-4" />
                  )}
                  Send code to email
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailStage("request");
                      setCode("");
                      setEmailDevCode(null);
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => emailVerifyMut.mutate()}
                    disabled={emailVerifyMut.isPending || code.length !== 6}
                    className="flex-1 bg-grad-primary"
                  >
                    {emailVerifyMut.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : null}
                    Verify &amp; sign in
                  </Button>
                </div>
              )}
              <p className="text-center text-[11px] text-muted-foreground">
                We'll send a 6-digit code to your inbox. Works with Gmail and any email provider.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>Student: +233240000001 / password123</p>
          <p>Driver: +233270000001 / password123</p>
          <p>Admin: +233200000001 / password123</p>
        </div>
      </div>
    </BottomSheet>
  );
}
