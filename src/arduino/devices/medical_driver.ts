import { Stepper } from "johnny-five"

export class MedicalDriver {
    private stepper: Stepper
    
    constructor(stepper: Stepper) {
        this.stepper = stepper
    }
    
    public async moveToPosition(position: number): Promise<void> {
        return new Promise((resolve, reject) => {
       
        })
    }
}