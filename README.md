# PDV MVP

Estrutura separada em:

- `frontend/`: aplicativo Next.js (PDV).
- `backend/`: assets do Supabase (migrations).

## Rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

Crie `.env.local` em `frontend/` com:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Backend (Supabase)

As migrações estão em `backend/supabase/migrations`.
Execute-as no projeto Supabase.

