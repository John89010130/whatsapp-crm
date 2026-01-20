# Supabase Database Schemas

Este diretório contém os schemas SQL para o banco de dados Supabase.

## Estrutura

- `master/` - Schema do banco Master (central)
- `company/` - Schema do banco por Empresa

## Banco Master (Central)

O banco Master gerencia:
- Usuários Master
- Owners e suas empresas
- Planos e limites
- Registry de projetos Supabase das empresas

## Banco por Empresa

Cada empresa tem seu próprio banco Supabase com:
- Instâncias WhatsApp
- Conversas e mensagens
- Usuários (Admin/Atendentes)
- Kanbans e colunas
- Automações
- Templates, tags, notas

## Como usar

1. Crie o projeto Supabase Master
2. Execute os scripts em `master/`
3. Para cada empresa, crie um novo projeto Supabase
4. Execute os scripts em `company/`
