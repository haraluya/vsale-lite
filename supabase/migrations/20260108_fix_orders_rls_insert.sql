-- Fix: Add INSERT policies for order_items and order_timelines tables
-- Feature: 004-cart-and-orders
-- Issue: Clients couldn't create orders because RLS blocked INSERT operations

-- =============================================================================
-- order_items: Allow clients to insert items when creating their own orders
-- =============================================================================

CREATE POLICY "Clients can insert items for their own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- =============================================================================
-- order_timelines: Allow authenticated users to insert timeline records
-- =============================================================================

CREATE POLICY "Authenticated users can insert timeline records"
  ON order_timelines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Note: The timeline INSERT is typically done by Server Actions with service role,
-- but this policy ensures clients can also insert timeline records when creating orders.
