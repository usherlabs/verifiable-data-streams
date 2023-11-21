import {defineConfig} from "vitest/config";

const vitestConfig = defineConfig({
    test: {
        setupFiles: ['dotenv/config']
    }
})

export default vitestConfig