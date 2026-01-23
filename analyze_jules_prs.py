#!/usr/bin/env python3
"""
Script para analisar PRs do Jules e preparar relatório de avaliação
"""
import json
import os
import sys
import subprocess
from typing import Dict, List, Any

def get_token() -> str:
    """Obtém o token do GitHub do arquivo .env"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(env_path):
        raise FileNotFoundError("Arquivo .env não encontrado")
    
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('GITHUB_PERSONAL_ACCESS_TOKEN'):
                token = line.split('=', 1)[1].strip().strip('"').strip("'")
                return token
    
    raise ValueError("Token GITHUB_PERSONAL_ACCESS_TOKEN não encontrado no .env")

def api_request(endpoint: str, token: str) -> Any:
    """Faz uma requisição à API do GitHub"""
    url = f"https://api.github.com{endpoint}"
    cmd = [
        'curl', '-s',
        '-H', f'Authorization: token {token}',
        '-H', 'Accept: application/vnd.github.v3+json',
        url
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Erro na requisição: {result.stderr}")
    return json.loads(result.stdout)

def analyze_pr(pr_number: int, token: str) -> Dict[str, Any]:
    """Analisa um PR específico coletando todas as informações"""
    owner = "mauriciobc"
    repo = "mealtime"
    
    print(f"Analisando PR #{pr_number}...", file=sys.stderr)
    
    # Detalhes do PR
    pr = api_request(f"/repos/{owner}/{repo}/pulls/{pr_number}", token)
    
    # Status de checks
    status = api_request(f"/repos/{owner}/{repo}/commits/{pr['head']['sha']}/status", token)
    
    # Reviews
    reviews = api_request(f"/repos/{owner}/{repo}/pulls/{pr_number}/reviews", token)
    
    # Arquivos alterados
    files = api_request(f"/repos/{owner}/{repo}/pulls/{pr_number}/files", token)
    
    # Comentários do PR
    comments = api_request(f"/repos/{owner}/{repo}/issues/{pr_number}/comments", token)
    
    # Verificar se pode ser merged
    mergeable = pr.get('mergeable')
    mergeable_state = pr.get('mergeable_state', 'unknown')
    
    return {
        'pr': pr,
        'status': status,
        'reviews': reviews,
        'files': files,
        'comments': comments,
        'mergeable': mergeable,
        'mergeable_state': mergeable_state
    }

def main():
    token = get_token()
    
    # Listar PRs abertos
    print("Listando PRs abertos...", file=sys.stderr)
    prs = api_request("/repos/mauriciobc/mealtime/pulls?state=open&base=main&sort=updated&direction=desc", token)
    
    # Filtrar PRs do Jules
    jules_prs = [pr for pr in prs if pr['user']['login'] == 'google-labs-jules[bot]']
    
    print(f"Encontrados {len(jules_prs)} PR(s) do Jules", file=sys.stderr)
    
    # Analisar cada PR
    results = []
    for pr in jules_prs:
        pr_number = pr['number']
        analysis = analyze_pr(pr_number, token)
        results.append(analysis)
    
    # Output JSON
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
