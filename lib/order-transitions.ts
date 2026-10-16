export function allowedOrderTransitions(status: string) {
  return [
    status,
    ...((
      {
        pending: ["cancelled"],
        confirmed: ["processing", "refunded"],
        processing: ["shipped", "refunded"],
        shipped: ["delivered", "refunded"],
        delivered: ["refunded"],
      } as Record<string, string[]>
    )[status] ?? []),
  ];
}
