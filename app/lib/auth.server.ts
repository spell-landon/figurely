import { redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "./supabase.server";

export async function requireAuth(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/login", { headers });
  }

  // Create session-like object for backwards compatibility
  const session = { user };

  return { session, supabase, headers };
}

export async function getSession(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { session, supabase, headers };
}

export async function signUp(
  request: Request,
  email: string,
  password: string,
  fullName: string
) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { data, headers };
}

export async function signIn(request: Request, email: string, password: string) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { data, headers };
}

export async function signOut(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);

  await supabase.auth.signOut();

  return redirect("/login", { headers });
}

export async function resetPasswordForEmail(request: Request, email: string) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${new URL(request.url).origin}/reset-password`,
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { success: true, headers };
}

export async function updatePassword(request: Request, newPassword: string) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { success: true, headers };
}

export async function updateEmail(request: Request, newEmail: string) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { success: true, headers };
}

export async function signInWithPhone(request: Request, phone: string) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { error } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { success: true, headers };
}

export async function verifyPhoneOtp(request: Request, phone: string, token: string) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { error: error.message, headers };
  }

  return { data, headers };
}
