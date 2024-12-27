import { HttpStatus } from "@nestjs/common"
import { userStub } from "src/user/__mocks__/user.stub"

export const loginStub = () => {
    return {
        accessToken: "jwttoken",
        user: userStub(),
    }
}

export const registerMessageStub = (email: string) => {
    return {
        message: `Confirmation link sent to your email ${email}`,
        statusCode: HttpStatus.OK,
    }
}

export const forgotPasswordMessageStub = (email: string) => {
    return {
        message: `Password reset email sent on ${email}`,
        statusCode: HttpStatus.OK,
    }
}

export const resetPasswordMessageStub = () => {
    return {
        message: `Password changed successfully`,
        statusCode: HttpStatus.OK,
    }
}