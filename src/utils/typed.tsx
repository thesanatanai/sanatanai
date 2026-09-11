/**
 * ### Your typing assistant
 * @param toType The array of strings to type
 * @param setPlaceHolder The function that updates the typed content
 * @returns Cleanup function
 */
export default function typed(
    toType: string[],
    setPlaceHolder: (x: string) => void
) {
    let arrIndex = 0;
    let currentIdx = 0;
    let typeFront = false;
    let timer: ReturnType<typeof setTimeout>;

    function type() {
        const text = toType[arrIndex];

        if (typeFront) {
            setPlaceHolder(text.substring(0, currentIdx - 1));
            currentIdx--;

            if (currentIdx === 0) {
                typeFront = false;
                arrIndex = (arrIndex + 1) % toType.length;
            }
        } else {
            setPlaceHolder(text.substring(0, currentIdx + 1));
            currentIdx++;

            if (currentIdx === text.length) {
                typeFront = true;
                timer = setTimeout(type, 1000);
                return;
            }
        }

        timer = setTimeout(type, typeFront ? 80 : 50);
    }

    type();

    return () => clearTimeout(timer);
}