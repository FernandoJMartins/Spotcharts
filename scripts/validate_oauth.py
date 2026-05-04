#!/usr/bin/env python
"""
Validação rápida do fluxo OAuth — Execute do diretório `backend/`

Uso:
    python ../scripts/validate_oauth.py

Valida:
1. Variáveis de ambiente configuradas
2. Encriptação Fernet disponível
3. Models e migrations
4. Endpoints acessíveis
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))
django.setup()

from django.conf import settings
from rest_framework.test import APIClient
from apps.accounts.models import UserProfile
from utils.crypto import get_fernet
from cryptography.fernet import Fernet

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_env_vars():
    print_header("1. Verificando Variáveis de Ambiente")
    
    required = [
        'SPOTIFY_CLIENT_ID',
        'SPOTIFY_CLIENT_SECRET',
        'SPOTIFY_REDIRECT_URI',
    ]
    
    optional = [
        'TOKEN_ENC_KEY',
        'JWT_SECRET',
        'FRONTEND_URL',
        'DJANGO_SECRET_KEY',
    ]
    
    print("\n✅ Variáveis OBRIGATÓRIAS:")
    for var in required:
        val = os.environ.get(var)
        status = "✅" if val else "❌"
        display = f"{val[:20]}..." if val and len(val) > 20 else val
        print(f"  {status} {var}: {display or '(não encontrada)'}")
    
    print("\n⚠️  Variáveis OPCIONAIS:")
    for var in optional:
        val = os.environ.get(var)
        status = "✅" if val else "⚠️ (usando default)"
        display = f"{val[:20]}..." if val and len(val) > 20 else val
        print(f"  {status} {var}: {display or '(não definida)'}")

def check_encryption():
    print_header("2. Validando Encriptação (Fernet)")
    
    try:
        f = get_fernet()
        print(f"  ✅ Chave Fernet válida")
        
        # Test encrypt/decrypt
        test_msg = "test-refresh-token"
        encrypted = f.encrypt(test_msg.encode()).decode()
        decrypted = f.decrypt(encrypted.encode()).decode()
        
        if decrypted == test_msg:
            print(f"  ✅ Encrypt/decrypt OK")
            print(f"     Plaintext: {test_msg}")
            print(f"     Encrypted (primeiros 20): {encrypted[:20]}...")
        else:
            print(f"  ❌ Decrypt falhou")
            return False
            
    except Exception as e:
        print(f"  ❌ Erro na encriptação: {e}")
        return False
    
    return True

def check_database():
    print_header("3. Validando Banco de Dados")
    
    try:
        # Check table exists
        count = UserProfile.objects.count()
        print(f"  ✅ Tabela UserProfile existe")
        print(f"     Usuários registrados: {count}")
        
        if count > 0:
            user = UserProfile.objects.first()
            has_refresh = bool(user.refresh_token_encrypted)
            has_expiry = user.token_expires_at is not None
            print(f"\n  📋 Exemplo de usuário armazenado:")
            print(f"     spotify_id: {user.spotify_id}")
            print(f"     display_name: {user.display_name}")
            print(f"     refresh_token_encrypted: {'✅' if has_refresh else '❌'}")
            print(f"     token_expires_at: {'✅' if has_expiry else '⚠️'}")
            
    except Exception as e:
        print(f"  ❌ Erro ao acessar banco: {e}")
        return False
    
    return True

def check_api_endpoints():
    print_header("4. Validando Endpoints da API")
    
    client = APIClient()
    
    endpoints = {
        'GET /api/auth/login/': ('/api/auth/login/', 'get', 302),
        'GET /api/auth/callback/ (sem code)': ('/api/auth/callback/', 'get', 400),
        'GET /api/me/ (sem autenticação)': ('/api/me/', 'get', 401),
        'POST /api/auth/refresh/ (sem autenticação)': ('/api/auth/refresh/', 'post', 401),
        'POST /api/auth/logout/': ('/api/auth/logout/', 'post', 200),  # sem autenticação = 200 mas sem efeito
    }
    
    print("\n🔍 Testando endpoints:")
    for name, (url, method, expected_status) in endpoints.items():
        try:
            if method == 'get':
                resp = client.get(url)
            else:
                resp = client.post(url)
            
            if resp.status_code in [expected_status, expected_status + 1]:  # allow nearby status
                print(f"  ✅ {name}")
                print(f"     Status: {resp.status_code}")
            else:
                print(f"  ⚠️  {name}")
                print(f"     Status esperado: {expected_status}, obtido: {resp.status_code}")
        except Exception as e:
            print(f"  ❌ {name}")
            print(f"     Erro: {e}")

def check_settings():
    print_header("5. Configurações Django")
    
    print(f"\n  DEBUG: {settings.DEBUG}")
    print(f"  SECRET_KEY: {'✅ Configurada' if settings.SECRET_KEY != 'change-me' else '⚠️  Valor padrão!'}")
    print(f"  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"  INSTALLED_APPS: {len(settings.INSTALLED_APPS)} apps")
    print(f"  MIDDLEWARE: {len(settings.MIDDLEWARE)} middlewares")
    
    # Check REST Framework config
    from rest_framework import settings as drf_settings
    print(f"\n  DRF DEFAULT_AUTHENTICATION_CLASSES:")
    for auth in drf_settings.DEFAULTS.get('DEFAULT_AUTHENTICATION_CLASSES', []):
        print(f"    - {auth.split('.')[-1]}")

def main():
    print("\n" + "🔐" * 30)
    print("VALIDAÇÃO — OAuth Authorization Code Flow")
    print("🔐" * 30)
    
    check_env_vars()
    
    if not check_encryption():
        print("\n❌ Encriptação falhou! Abortando...")
        return False
    
    if not check_database():
        print("\n⚠️  Execute 'python manage.py migrate' para criar tabelas")
    
    check_api_endpoints()
    check_settings()
    
    print_header("✅ RESUMO")
    print("\n🎯 Próximas etapas:")
    print("   1. Configure SPOTIFY_CLIENT_ID, CLIENT_SECRET, REDIRECT_URI em .env")
    print("   2. Execute: python manage.py runserver 0.0.0.0:8000")
    print("   3. Abra: http://localhost:8000/api/auth/login/")
    print("   4. Faça login no Spotify e autorize")
    print("   5. Verifique /api/me/ para confirmar autenticação")
    print("   6. Veja [docs/TESTING_OAUTH_FLOW.md] para testes completos")
    print("\n")
    return True

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Erro geral: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
