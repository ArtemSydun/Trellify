import { HttpStatus } from "@nestjs/common"
import { userStub } from "../../user/__mocks__/user.stub"

export const loginStub = () => {
    return {
        accessToken: "jwttoken",
        user: userStub(),
    }
}

export const registerMessageStub = () => {
    return {
        message: `Confirmation link sent to your email test@gmail.com`,
        statusCode: HttpStatus.OK,
    }
}

export const forgotPasswordMessageStub = () => {
    return {
        message: `Password reset email sent on test@gmail.com`,
        statusCode: HttpStatus.OK,
    }
}

export const resetPasswordMessageStub = () => {
    return {
        message: `Password changed successfully`,
        statusCode: HttpStatus.OK,
    }
}