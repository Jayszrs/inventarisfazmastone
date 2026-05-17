
CREATE POLICY "Users can delete their own transaksi"
ON public.transaksi FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any transaksi"
ON public.transaksi FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update detail of their transaksi"
ON public.detail_transaksi FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.transaksi t WHERE t.id = detail_transaksi.transaksi_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can delete detail of their transaksi"
ON public.detail_transaksi FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.transaksi t WHERE t.id = detail_transaksi.transaksi_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
