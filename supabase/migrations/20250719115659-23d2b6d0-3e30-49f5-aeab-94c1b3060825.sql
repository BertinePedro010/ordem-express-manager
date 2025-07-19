-- Tornar o usuário atual admin para acessar funcionalidades de administrador
UPDATE profiles 
SET user_type = 'admin' 
WHERE user_id = '8b3cd930-f999-4e30-a5a0-7f6d9e9917d2';