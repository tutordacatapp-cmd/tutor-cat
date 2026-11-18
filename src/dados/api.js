// Escolhe de onde vêm os dados: Supabase (se configurado) ou modo demo.
// O build "demo" (link de teste dentro do Claude) usa sempre o modo demo.
import { demo } from './demo.js';
import { supabase } from './supabase.js';

export const api = import.meta.env.MODE === 'demo' ? demo : supabase || demo;
