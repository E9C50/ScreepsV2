module.exports = function (grunt) {
    // 加载任务依赖
    grunt.loadNpmTasks('grunt-screeps');
    grunt.loadNpmTasks('grunt-contrib-watch');
    var config = require('./.screeps.json')
    // 定义任务
    grunt.initConfig({
        // 官方服务器
        screeps: {
            options: {
                email: config.email,
                password: config.password,
                branch: config.branch,
                ptr: config.ptr
            },
            dist: {
                src: ['*.js'],
            }
        },
        // 私服
        homelab: {
            options: {
                server: {
                    host: '10.1.1.50',
                    port: 21025,
                    http: true
                },
                email: config.email,
                password: config.password,
                branch: config.branch,
                ptr: false
            },
            dist: {
                src: ['*.js']
            }
        },
        // 代码变更监听任务
        watch: {
            files: "*.js",
            tasks: ["screeps", "homelab"]
        }
    });
    // 注册默认任务
    grunt.registerTask("default", ["watch"])
}