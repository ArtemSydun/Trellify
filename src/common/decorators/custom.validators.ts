export class IsNullOrEmptyString {
    validate(value: any) {
        return value === null || value !== '';
    }

    defaultMessage() {
        return 'Value cannot be an empty string';
    }
}