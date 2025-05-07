const MESSAGES = {
    INSUFFICIENT_STOCK_MESSAGE : 'Some items have insufficient stock',
    COUPON_APPLIED_SUCCESS_MESSAGE : 'Coupon applied successfully',
    INVALID_OR_EXPIRED_COUPON : 'Invalid or expired coupon code',
    COUPON_APPLY_FAILED : 'Failed to apply coupon',
    CART_EMPTY_OR_INVALID : 'Cart is empty or invalid.',
    INVALID_ADDRESS : 'Invalid address.',
    ADDRESS_NOT_FOUND : 'Address not found.',
    ORDER_PLACED_SUCCESSFULLY : 'Order placed successfully',
    ORDER_CREATION_FAILED : 'Failed to create order',
    ORDER_NOT_FOUND : 'Order not found.',
    PAYMENT_VERIFIED_SUCCESS : 'Payment verified and order processed successfully.',
    PAYMENT_VERIFICATION_FAILED : 'Failed to verify payment.',
    PAYMENT_VERIFICATION_ERROR : 'Payment verification failed',
    USER_NOT_FOUND : 'User not found.',
    INSUFFICIENT_WALLET_BALANCE : 'Insufficient wallet balance.',
    ORDER_PLACED_WITH_WALLET : 'Order placed successfully with Wallet.',
    WALLET_PAYMENT_FAILED : 'Failed to process Wallet payment. Please try again.',
    INVALID_PAYMENT_METHOD : 'Invalid payment method',
    ORDER_PROCESSING_FAILED : 'Unable to process order',
    PRODUCT_NOT_FOUND_IN_ORDER : 'Product not found in order.',
    PRODUCT_ALREADY_DELIVERED_OR_RETURNED : 'Product has already been delivered or returned and cannot be canceled.',
    PRODUCT_ALREADY_CANCELED : 'Product is already canceled.',
    ORDER_CANCELLATION_SUCCESS : 'Order cancelled successfully',
    ORDER_CANCELLATION_FAILED : 'Failed to cancel the product. Please try again later.',
    CANCELLED_PRODUCTS_CANNOT_BE_RETURNED : 'Cancelled products cannot be returned.',
    ONLY_DELIVERED_PRODUCTS_CAN_BE_RETURNED : 'Only delivered products can be returned.',
    PRODUCT_ALREADY_RETURNED : 'The product is already returned.',
    PRODUCT_RETURN_INITIATED_SUCCESS : 'Product return initiated successfully',
    PRODUCT_RETURN_FAILED : 'Failed to return the product. Please try again later.',
}
const ERROR = {
    SERVER_ERROR : 'Server error',
}


module.exports = {
    MESSAGES,
    ERROR
}