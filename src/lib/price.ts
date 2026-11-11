export async function priceFor(supabase: any, modelId: string | null, condition: string | null) {
  if (!modelId) return null;
  const { data } = await supabase
    .from('price_reports')
    .select('low,median,high,sample_size,is_estimate')
    .eq('model_id', modelId)
    .eq('condition', condition || 'like_new')
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    low: Number(data.low),
    median: Number(data.median),
    high: Number(data.high),
    sampleSize: data.sample_size as number,
    estimate: data.is_estimate as boolean,
  };
}
