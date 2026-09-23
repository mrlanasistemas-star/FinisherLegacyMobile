import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addCartItem, applyCartCoupon, fetchCart, removeCartCoupon, removeCartItem, updateCartItem, type AddCartItemPayload } from '@/api/cart';
import { queryKeys } from '@/hooks/query-keys';
import { useAuthStore } from '@/stores/authStore';
import type { Cart } from '@/types/models';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';

export function useCart() {
  const authenticated = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({ queryKey: queryKeys.cart, queryFn: fetchCart, enabled: authenticated });
}

/** Item count for the Tienda tab badge / cart icon. */
export function cartItemCount(cart: Cart | undefined): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function useCartCount(): number {
  const { data } = useCart();
  return cartItemCount(data);
}

/** Every cart write returns the full server-computed Cart — money is never recalculated here. */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>, onDone?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      await ensureOnline();
      return mutationFn(variables);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
      onDone?.();
    },
  });
}

export function useAddCartItem() {
  return useCartMutation((payload: AddCartItemPayload) => addCartItem(payload), haptics.success);
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: number; quantity: number }) => updateCartItem(itemId, quantity));
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: number) => removeCartItem(itemId), haptics.light);
}

export function useApplyCartCoupon() {
  return useCartMutation((code: string) => applyCartCoupon(code), haptics.success);
}

export function useRemoveCartCoupon() {
  return useCartMutation<void>(() => removeCartCoupon());
}
