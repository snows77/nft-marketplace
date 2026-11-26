// ETH continua string: só formatamos para exibir, sem converter para number
export const formatEth = (value: string) => `${value} ETH`

export const formatTokenNumber = (n: number) => `#${String(n).padStart(3, '0')}`