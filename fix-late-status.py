#!/usr/bin/env python3

# Fix late status styling in both attendance history tables

file_path = r'c:\Users\lebro\Downloads\safe-gate-pwa-design\app\students\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the statusLabel and badgeClass lines to add 'late' case
old_statusLabel = """                                                          const statusLabel = rawStatus
                                                            ? (rawStatus === 'present' ? 'Present' : rawStatus === 'absent' ? 'Absent' : rawStatus === 'holiday' ? 'Holiday' : rawStatus === 'cancelled_class' ? 'Cancelled' : rawStatus)
                                                            : (entry.is_present ? 'Present' : 'Absent');"""

new_statusLabel = """                                                          const statusLabel = rawStatus
                                                            ? (rawStatus === 'present' ? 'Present' : rawStatus === 'absent' ? 'Absent' : rawStatus === 'holiday' ? 'Holiday' : rawStatus === 'cancelled_class' ? 'Cancelled' : rawStatus === 'late' ? 'Late' : rawStatus)
                                                            : (entry.is_present ? 'Present' : 'Absent');"""

content = content.replace(old_statusLabel, new_statusLabel)

# Replace the badgeClass line to add 'late' color
old_badgeClass = """const badgeClass = rawStatus === 'holiday' ? 'bg-sky-100 text-sky-700' : rawStatus === 'cancelled_class' ? 'bg-slate-100 text-slate-700' : rawStatus === 'absent' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';"""

new_badgeClass = """const badgeClass = rawStatus === 'holiday' ? 'bg-sky-100 text-sky-700' : rawStatus === 'cancelled_class' ? 'bg-slate-100 text-slate-700' : rawStatus === 'absent' ? 'bg-rose-100 text-rose-700' : rawStatus === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700';"""

content = content.replace(old_badgeClass, new_badgeClass)

# Also replace the isLate condition in the badge rendering
old_isLate_condition = """{isLate && (
                                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 py-1 px-2 text-xs w-fit">
                                                                      Late
                                                                    </Badge>
                                                                  )}"""

new_isLate_condition = """{isLate && rawStatus !== 'late' && (
                                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 py-1 px-2 text-xs w-fit">
                                                                      Late
                                                                    </Badge>
                                                                  )}"""

content = content.replace(old_isLate_condition, new_isLate_condition)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed late status styling in both attendance history tables")
