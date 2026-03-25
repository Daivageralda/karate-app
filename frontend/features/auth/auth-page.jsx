"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { loginAuthUser, registerAuthUser } from "@/features/auth/service";
import { setCurrentUser } from "@/shared/services/current-user";
import { useToast } from "@/shared/components/toast-provider";
import { ROUTES } from "@/shared/config/routes";

const AUTH_MODES = Object.freeze({
  login: "login",
  register: "register",
});

const initialRegisterForm = Object.freeze({
  name: "",
  email: "",
  password: "",
  dojoId: "",
});

const initialLoginForm = Object.freeze({
  email: "",
  password: "",
});

const resolveRoleLabel = (role) => {
  if (role === "super_admin") {
    return "Super Admin";
  }

  if (role === "dojo_admin") {
    return "Dojo Admin";
  }

  return role || "-";
};

export function AuthPage({ dojoOptions = [] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState(AUTH_MODES.login);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const hasDojoOptions = Array.isArray(dojoOptions) && dojoOptions.length > 0;

  const handleSwitchMode = (nextMode) => {
    if (isSubmitting) {
      return;
    }

    setMode(nextMode);
    setErrorMessage("");
  };

  const handleRegisterFieldChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((previousValue) => {
      return {
        ...previousValue,
        [name]: value,
      };
    });
  };

  const handleLoginFieldChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((previousValue) => {
      return {
        ...previousValue,
        [name]: value,
      };
    });
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!registerForm.dojoId) {
      const message = "Dojo wajib dipilih untuk registrasi dojo admin.";
      setErrorMessage(message);
      showToast({
        tone: "error",
        title: "Validasi Gagal",
        message,
      });
      return;
    }

    if (registerForm.password.trim().length < 8) {
      const message = "Password minimal 8 karakter.";
      setErrorMessage(message);
      showToast({
        tone: "error",
        title: "Validasi Gagal",
        message,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const registeredUser = await registerAuthUser({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        dojo_id: registerForm.dojoId,
      });

      showToast({
        tone: "success",
        title: "Register Berhasil",
        message: `Akun ${registeredUser.name || registeredUser.email} berhasil dibuat.`,
      });

      setRegisterForm(initialRegisterForm);
      setMode(AUTH_MODES.login);
      setLoginForm((previousValue) => {
        return {
          ...previousValue,
          email: registeredUser.email || previousValue.email,
          password: "",
        };
      });
    } catch (error) {
      const message = error?.message || "Gagal register.";
      setErrorMessage(message);
      showToast({
        tone: "error",
        title: "Register Gagal",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    setIsSubmitting(true);

    try {
      const user = await loginAuthUser({
        email: loginForm.email,
        password: loginForm.password,
      });

      // Save user to localStorage
      setCurrentUser(user);

      setLoggedInUser(user);
      setLoginForm((previousValue) => {
        return {
          ...previousValue,
          password: "",
        };
      });

      showToast({
        tone: "success",
        title: "Login Berhasil",
        message: `Selamat datang ${user.name || user.email}.`,
      });

      // Redirect after a short delay to show the toast
      setTimeout(() => {
        if (user.role === "super_admin") {
          router.push(ROUTES.home);
        } else if (user.role === "dojo_admin") {
          router.push("/dashboard/dojo");
        } else {
          router.push(ROUTES.home);
        }
      }, 500);
    } catch (error) {
      const message = error?.message || "Gagal login.";
      setErrorMessage(message);
      showToast({
        tone: "error",
        title: "Login Gagal",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginButtonClassName = mode === AUTH_MODES.login
    ? "rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast"
    : "rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent";

  const registerButtonClassName = mode === AUTH_MODES.register
    ? "rounded-full border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-contrast"
    : "rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent";

  return (
    <div className="min-h-screen bg-app-bg text-app-text-primary">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_1fr]">
          <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-8">
            <span className="inline-flex rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-secondary">
              EO Karate
            </span>

            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-app-text-primary sm:text-5xl">
              Auth Portal
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-app-text-secondary sm:text-base">
              Halaman ini fokus hanya untuk autentikasi user. Register dari halaman ini selalu membuat akun Dojo Admin,
              tidak bisa membuat Super Admin.
            </p>

            <div className="mt-6 inline-flex flex-wrap items-center gap-2">
              <button type="button" disabled={isSubmitting} onClick={() => handleSwitchMode(AUTH_MODES.login)} className={loginButtonClassName}>
                Login
              </button>
              <button type="button" disabled={isSubmitting} onClick={() => handleSwitchMode(AUTH_MODES.register)} className={registerButtonClassName}>
                Register
              </button>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-app-text-secondary">
              Setelah login, kamu bisa kembali ke dashboard secara manual.
            </p>
            <Link
              href={ROUTES.home}
              className="mt-2 inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold text-app-text-primary transition hover:border-app-accent hover:text-app-accent"
            >
              Kembali ke Dashboard
            </Link>
          </section>

          <section className="rounded-3xl border border-app-border bg-app-surface p-6 shadow-sm">
            {mode === AUTH_MODES.register ? (
              <form className="grid gap-4" onSubmit={handleRegisterSubmit}>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-app-text-primary">Register</h2>

                {!hasDojoOptions ? (
                  <p className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-secondary">
                    Belum ada dojo tersedia. Buat dojo terlebih dahulu sebelum register akun dojo admin.
                  </p>
                ) : null}

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  Nama
                  <input
                    type="text"
                    name="name"
                    value={registerForm.name}
                    onChange={handleRegisterFieldChange}
                    required
                    className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
                  />
                </label>

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={handleRegisterFieldChange}
                    required
                    className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
                  />
                </label>

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  Password
                  <input
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterFieldChange}
                    required
                    minLength={8}
                    className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
                  />
                </label>

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  Dojo
                  <select
                    name="dojoId"
                    value={registerForm.dojoId}
                    onChange={handleRegisterFieldChange}
                    required
                    className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
                  >
                    <option value="">Pilih dojo</option>
                    {dojoOptions.map((dojo) => {
                      return (
                        <option key={dojo.id} value={dojo.id}>
                          {dojo.name}
                        </option>
                      );
                    })}
                  </select>
                </label>

                {errorMessage ? (
                  <p className="rounded-xl border border-app-danger bg-app-danger px-3 py-2 text-sm text-app-danger-contrast">
                    {errorMessage}
                  </p>
                ) : null}

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !hasDojoOptions}
                    className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-5 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Memproses..." : "Register"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={handleLoginSubmit}>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-app-text-primary">Login</h2>

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginFieldChange}
                    required
                    className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
                  />
                </label>

                <label className="grid gap-2 text-sm text-app-text-secondary">
                  Password
                  <input
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginFieldChange}
                    required
                    className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text-primary outline-none transition focus:border-app-accent"
                  />
                </label>

                {errorMessage ? (
                  <p className="rounded-xl border border-app-danger bg-app-danger px-3 py-2 text-sm text-app-danger-contrast">
                    {errorMessage}
                  </p>
                ) : null}

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-full border border-app-accent bg-app-accent px-5 py-2 text-sm font-semibold text-app-accent-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Memproses..." : "Login"}
                  </button>
                </div>
              </form>
            )}

            {loggedInUser ? (
              <section className="mt-6 rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <h3 className="font-display text-lg font-semibold tracking-tight text-app-text-primary">Login Result</h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Nama</dt>
                    <dd className="mt-1 text-sm font-medium text-app-text-primary">{loggedInUser.name || "-"}</dd>
                  </div>
                  <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Email</dt>
                    <dd className="mt-1 text-sm font-medium text-app-text-primary">{loggedInUser.email || "-"}</dd>
                  </div>
                  <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Role</dt>
                    <dd className="mt-1 text-sm font-medium text-app-text-primary">{resolveRoleLabel(loggedInUser.role)}</dd>
                  </div>
                  <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                    <dt className="text-xs uppercase tracking-wide text-app-text-secondary">Dojo</dt>
                    <dd className="mt-1 text-sm font-medium text-app-text-primary">{loggedInUser.dojoName || "-"}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
