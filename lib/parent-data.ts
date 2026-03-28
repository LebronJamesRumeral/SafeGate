import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase, type Student } from '@/lib/supabase';

export async function getParentStudents(parentEmail: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('parent_email', parentEmail);
  return data || [];
}
