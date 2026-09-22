import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addCartItem, applyCartCoupon, fetchCart, removeCartCoupon, removeCartItem, updateCartItem } from '@/api/cart';
import type { Cart } from '@/types/models';

const CART_KEY = ['cart'];

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: fetchCart,
  });
}

function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_KEY, cart);
    },
  });
}

export function useAddCartItem() {
  return useCartMutation(addCartItem);
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: number; quantity: number }) =>
    updateCartItem(itemId, quantity),
  );
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: number) => removeCartItem(itemId));
}

export function useApplyCartCoupon() {
  return useCartMutation((code: string) => applyCartCoupon(code));
}

export function useRemoveCartCoupon() {
  return useCartMutation<void>(() => removeCartCoupon());
}
