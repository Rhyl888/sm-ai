export function useDialog() {
   const createDialog = (opts: CreateDialogProps) => {
    return new Promise<string>((resolve) => {
      window.api.createDialog(opts).then(res => {
        resolve(res)
        // todo : modal
      })
      // todo : modal
    })
   }

   return { createDialog }
}


export default useDialog;
