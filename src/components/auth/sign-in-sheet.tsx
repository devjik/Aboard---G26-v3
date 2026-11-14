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
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Mode = "password" | "otp";
type OtpStage = "request" | "verify";

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

  useEffect(() => {
    if (open) {
      setMode("password");
      setOtpStage("request");
      setPhone("");
      setPassword("");
      setCode("");
      setDevCode(null);
    }
  }, [open]);

  const loginMut = useMutation({
    mutationFn: () =>
      apiClient.auth.login({ phone, password }),
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
        <div className="relative inline-flex w-full rounded-full border border-border bg-card p-1">
          {(["password", "otp"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "relative flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
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
                {m === "password" ? "Password" : "OTP"}
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
        </AnimatePresence>

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>Admin: +233200000001 / password123</p>
          <p>Student: +233240000001 / password123</p>
          <p>Driver: +233270000001 / password123</p>
        </div>
      </div>
    </BottomSheet>
  );
}
