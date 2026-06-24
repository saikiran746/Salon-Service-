import sys

path = 'c:/Users/hi/Downloads/completely new/frontend/src/pages/admin/analytics/ClientAnalytics.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix TotalClientsModal
start_idx = content.find('function TotalClientsModal({ onClose }) {')
end_idx = content.find('// ── Membership Holders Modal', start_idx)

if start_idx != -1 and end_idx != -1:
    with open('total_clients_new.txt', 'r', encoding='utf-8') as f2:
        total_clients_new = f2.read()
    content = content[:start_idx] + total_clients_new + "\n\n" + content[end_idx:]
    print('Fixed TotalClientsModal')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
