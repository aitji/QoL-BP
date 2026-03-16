export const clamp = (n, min = 0, max = 8) => Math.max(min, Math.min(max, Math.ceil(n)))

export const checkRandom = (arr) => {
    switch (typeof arr) {
        case 'object': return Math.random() * arr[0] + arr[1]
        case 'number': return arr
        default:
            console.warn("RANDOM AREN'T SET CORRECTLY")
            return 1
    }
}
