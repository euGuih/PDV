"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setAuthError("Credenciais inválidas.");
      setLoading(false);
      return;
    }

    router.push("/pdv");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="seu@email.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-600">Email inválido.</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Senha</label>
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-600">Senha obrigatória.</p>
        )}
      </div>

      {authError && <p className="text-sm text-red-600">{authError}</p>}

      <button
        className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        type="submit"
        disabled={loading}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}


