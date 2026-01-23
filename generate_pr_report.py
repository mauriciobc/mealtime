#!/usr/bin/env python3
"""
Gera relatório resumido dos PRs do Jules
"""
import json
import sys

def analyze_status(status):
    """Analisa o status dos checks"""
    state = status.get('state', 'unknown')
    contexts = status.get('statuses', [])
    
    passing = sum(1 for c in contexts if c.get('state') == 'success')
    pending = sum(1 for c in contexts if c.get('state') == 'pending')
    failing = sum(1 for c in contexts if c.get('state') == 'failure' or c.get('state') == 'error')
    
    return {
        'overall_state': state,
        'total': len(contexts),
        'passing': passing,
        'pending': pending,
        'failing': failing,
        'all_passing': state == 'success' and failing == 0
    }

def analyze_reviews(reviews):
    """Analisa os reviews"""
    approved = [r for r in reviews if r.get('state') == 'APPROVED']
    changes_requested = [r for r in reviews if r.get('state') == 'CHANGES_REQUESTED']
    commented = [r for r in reviews if r.get('state') == 'COMMENTED']
    
    return {
        'total': len(reviews),
        'approved': len(approved),
        'changes_requested': len(changes_requested),
        'commented': len(commented),
        'has_approval': len(approved) > 0,
        'has_blocking_review': len(changes_requested) > 0
    }

def analyze_files(files):
    """Analisa os arquivos alterados"""
    total_additions = sum(f.get('additions', 0) for f in files)
    total_deletions = sum(f.get('deletions', 0) for f in files)
    total_changes = total_additions + total_deletions
    
    file_types = {}
    for f in files:
        filename = f.get('filename', '')
        ext = filename.split('.')[-1] if '.' in filename else 'no-extension'
        file_types[ext] = file_types.get(ext, 0) + 1
    
    return {
        'total_files': len(files),
        'total_additions': total_additions,
        'total_deletions': total_deletions,
        'total_changes': total_changes,
        'file_types': file_types,
        'files': [f.get('filename') for f in files[:10]]  # Primeiros 10 arquivos
    }

def generate_report(analysis_data):
    """Gera relatório estruturado"""
    reports = []
    
    for item in analysis_data:
        pr = item['pr']
        status_info = analyze_status(item['status'])
        reviews_info = analyze_reviews(item['reviews'])
        files_info = analyze_files(item['files'])
        
        # Determinar recomendação
        recommendation = "PENDENTE"
        issues = []
        
        if pr.get('draft'):
            recommendation = "DRAFT"
            issues.append("PR está em modo draft")
        
        if item.get('mergeable') is False:
            recommendation = "BLOQUEADO"
            issues.append("PR não pode ser merged (conflitos ou outros problemas)")
        
        if status_info['failing'] > 0:
            recommendation = "BLOQUEADO"
            issues.append(f"{status_info['failing']} check(s) falhando")
        elif status_info['pending'] > 0:
            recommendation = "PENDENTE"
            issues.append(f"{status_info['pending']} check(s) pendente(s)")
        
        if reviews_info['has_blocking_review']:
            recommendation = "BLOQUEADO"
            issues.append("Review solicitando mudanças")
        elif not reviews_info['has_approval'] and reviews_info['total'] == 0:
            recommendation = "PENDENTE"
            issues.append("Nenhum review ainda")
        
        if status_info['all_passing'] and reviews_info['has_approval'] and not pr.get('draft') and item.get('mergeable') is True:
            recommendation = "APROVADO"
        
        report = {
            'pr_number': pr['number'],
            'title': pr['title'],
            'author': pr['user']['login'],
            'branch': pr['head']['ref'],
            'is_draft': pr.get('draft', False),
            'created_at': pr['created_at'],
            'updated_at': pr['updated_at'],
            'url': pr['html_url'],
            'status': {
                'overall': status_info['overall_state'],
                'checks_passing': status_info['all_passing'],
                'summary': f"{status_info['passing']}/{status_info['total']} checks passando"
            },
            'reviews': {
                'has_approval': reviews_info['has_approval'],
                'has_blocking': reviews_info['has_blocking_review'],
                'summary': f"{reviews_info['approved']} aprovado(s), {reviews_info['changes_requested']} solicitando mudanças"
            },
            'files': {
                'total': files_info['total_files'],
                'changes': f"+{files_info['total_additions']} -{files_info['total_deletions']}",
                'file_types': files_info['file_types']
            },
            'mergeability': {
                'mergeable': item.get('mergeable'),
                'state': item.get('mergeable_state', 'unknown')
            },
            'recommendation': recommendation,
            'issues': issues,
            'description': pr.get('body', '')[:500]  # Primeiros 500 caracteres
        }
        
        reports.append(report)
    
    return reports

def main():
    if len(sys.argv) < 2:
        print("Uso: python3 generate_pr_report.py <arquivo_analise.json>", file=sys.stderr)
        sys.exit(1)
    
    with open(sys.argv[1], 'r') as f:
        analysis_data = json.load(f)
    
    reports = generate_report(analysis_data)
    print(json.dumps(reports, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
