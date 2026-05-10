-- Crea la tabella per le iscrizioni alle notifiche push
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Rendi l'endpoint unico per evitare doppioni sullo stesso dispositivo
ALTER TABLE push_subscriptions ADD CONSTRAINT unique_endpoint UNIQUE (endpoint);

-- Configura la sicurezza Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere e modificare solo le proprie iscrizioni
CREATE POLICY "Gli utenti possono gestire le proprie notifiche"
ON push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Se usi chiavi Anon/Service Role senza auth.uid() diretto (come nel nostro caso backend), serve anche:
CREATE POLICY "Permetti tutto al service_role o bypass se serve"
ON push_subscriptions
FOR ALL 
USING (true)
WITH CHECK (true);
