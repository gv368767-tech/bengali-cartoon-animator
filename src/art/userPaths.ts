// নিজের ছবির চরিত্রের ফাইল-পথ (ফোনের ভেতরে, অ্যাপের নিজস্ব ফোল্ডারে)
let dir = "";
export const setUserCharDir = (d: string) => { dir = d.endsWith("/") ? d : d + "/"; };
export const getUserCharDir = () => dir;
export const USR_PREFIX = "usr:";
export const userCharKey = (id: string) => USR_PREFIX + id;
export const userCharPath = (id: string) => dir + id + ".png";
