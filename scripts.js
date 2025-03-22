function handleImageError(imgElement) {
    const sources = imgElement.dataset.sources.split(',');
    let currentIndex = parseInt(imgElement.dataset.current || 0);
    
    if (currentIndex < sources.length - 1) {
        currentIndex++;
        imgElement.style.backgroundImage = `url('${sources[currentIndex]}')`;
        imgElement.dataset.current = currentIndex;
    } else {
        imgElement.style.backgroundColor = '#f0f0f0';
        imgElement.innerHTML = '<p style="color:#999;padding:20px">图片加载失败</p>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const lockScreen = document.getElementById('lockScreen');
    const mainContent = document.getElementById('mainContent');
    const body = document.body;
    const swipeHint = document.querySelector('.swipe-hint');
    const blurBg = document.querySelector('.blur-bg');
    const dailyQuote = document.getElementById('dailyQuote');
    
    // 文章详情页面相关元素
    const articleLinks = document.querySelectorAll('.post-link, .read-more');
    const closeArticleBtn = document.getElementById('closeArticle');
    const articleTitle = document.getElementById('articleTitle');
    const articleDate = document.getElementById('articleDate');
    const articleContent = document.getElementById('articleContent');
    const blurToggle = document.getElementById('blurToggle');
    const articleDetailPage = document.querySelector('.article-detail-page');
    
    // 预加载文章内容
    const articleContents = {};
    // 获取所有文章链接
    articleLinks.forEach((link) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取文章路径
            const articlePath = this.getAttribute('href');
            
            // 获取文章信息
            const article = this.closest('.blog-post');
            const title = article.querySelector('.post-title').textContent;
            
            // 获取文章缩略图URL
            let thumbnailUrl = '';
            const thumbnailImg = article.querySelector('.post-thumbnail');
            if (thumbnailImg && thumbnailImg.src) {
                thumbnailUrl = thumbnailImg.src;
            }
            
            // 打开文章详情页
            openArticleDetail(articlePath, title, thumbnailUrl);
        });
    });
    
    // 添加文章详情页加载功能
    function openArticleDetail(articlePath, title, thumbnailUrl) {
        // 设置文章详情页背景和标题
        if (thumbnailUrl) {
            articleDetailPage.style.backgroundImage = `url('${thumbnailUrl}')`;
            articleDetailPage.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        }
        
        document.getElementById('articleTitle').textContent = title;
        document.getElementById('articleContent').innerHTML = '<p class="loading-text">正在加载文章内容...</p>';
        
        // 使用XMLHttpRequest替代fetch
        const xhr = new XMLHttpRequest();
        xhr.open('GET', articlePath, true);
        
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400) {
                console.log('成功获取文章内容');
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(xhr.responseText, 'text/html');
                const content = doc.querySelector('.post-content');
                
                if (content) {
                    document.getElementById('articleContent').innerHTML = content.innerHTML;
                    
                    const postDate = doc.querySelector('.post-date');
                    if (postDate) {
                        document.getElementById('articleDate').textContent = postDate.textContent;
                    }
                } else {
                    console.error('未找到.post-content元素');
                    document.getElementById('articleContent').innerHTML = `
                        <div class="error-message">
                            <h3>加载文章失败</h3>
                            <p>文章内容格式不正确，未找到.post-content元素</p>
                        </div>
                    `;
                }
            } else {
                handleArticleError(xhr.statusText || '文件访问错误', articlePath);
            }
        };
        
        xhr.onerror = function() {
            handleArticleError('无法访问文件，请使用本地服务器', articlePath);
        };
        
        xhr.send();
        
        // 打开文章详情页
        document.body.classList.add('article-open');
        articleDetailPage.classList.remove('closing');
    }
    
    function handleArticleError(errorMsg, articlePath) {
        console.error('加载文章失败:', errorMsg, '路径:', articlePath);
        document.getElementById('articleContent').innerHTML = `
            <div class="error-message">
                <h3>加载文章失败</h3>
                <p>${errorMsg}</p>
                <p>文章路径: ${articlePath}</p>
                <p><strong>解决方案:</strong></p>
                <ol>
                    <li>使用本地服务器运行此网站（推荐）：
                        <ul>
                            <li>VS Code用户: 安装Live Server插件</li>
                            <li>Python用户: 在网站目录运行 <code>python -m http.server</code></li>
                            <li>Node.js用户: 安装 <code>npm install -g http-server</code> 然后运行 <code>http-server</code></li>
                        </ul>
                    </li>
                    <li>或尝试使用Chrome浏览器，并添加<code>--allow-file-access-from-files</code>参数启动</li>
                </ol>
            </div>
        `;
    }
    
    // 关闭文章详情页面 - 修改为在关闭时重置背景
    closeArticleBtn.addEventListener('click', function() {
        // 不立即移除类，而是先添加过渡类
        articleDetailPage.classList.add('closing');
        
        // 添加主内容区域的过渡动画
        mainContent.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), filter 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
        
        // 重置主内容区域的位置和模糊效果
        mainContent.style.transform = 'translateX(0)';
        mainContent.style.filter = 'blur(0px)';
        
        // 文章内容也需要过渡
        articleContent.style.opacity = '0';
        articleContent.style.transform = 'translateX(20px)';
        
        // 等待过渡动画完成后，再移除类并清空内容
        setTimeout(() => {
            body.classList.remove('article-open');
            articleDetailPage.classList.remove('closing');
            
            // 彻底清除所有内联样式
            mainContent.removeAttribute('style');
            articleContent.removeAttribute('style');
            
            // 重置文章详情页背景
            articleDetailPage.style.backgroundImage = '';
            articleDetailPage.style.backgroundColor = '';
            
            // 延迟清空内容
            setTimeout(() => {
                articleContent.innerHTML = '<p>加载中...</p>';
            }, 100);
        }, 500);
    });
    
    // 修改每日一语数据获取方式 - 从网络API获取
    function fetchDailyQuote() {
        // 显示加载状态
        dailyQuote.textContent = "正在获取每日一言...";
        
        // 使用一言API获取随机句子
        fetch('https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=h&c=i&c=j&c=k')
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络请求失败');
                }
                return response.json();
            })
            .then(data => {
                // 显示获取的句子和来源
                const quoteText = data.hitokoto;
                const quoteSource = data.from ? `——《${data.from}》` : '';
                
                // 设置显示内容
                dailyQuote.innerHTML = `${quoteText}<br><span class="quote-source">${quoteSource}</span>`;
                
                // 保存到本地存储，以便离线使用
                const savedQuote = {
                    text: quoteText,
                    source: quoteSource,
                    timestamp: new Date().getTime()
                };
                localStorage.setItem('dailyQuote', JSON.stringify(savedQuote));
            })
            .catch(error => {
                console.error('获取每日一言失败:', error);
                
                // 尝试从本地存储获取上次保存的内容
                const savedQuote = localStorage.getItem('dailyQuote');
                if (savedQuote) {
                    try {
                        const { text, source } = JSON.parse(savedQuote);
                        dailyQuote.innerHTML = `${text}<br><span class="quote-source">${source}</span>`;
                        dailyQuote.innerHTML += '<br><small>(离线模式)</small>';
                    } catch (e) {
                        // 如果解析失败，使用备用内容
                        useFallbackQuote();
                    }
                } else {
                    // 如果没有本地存储，使用备用内容
                    useFallbackQuote();
                }
            });
    }
    
    // 备用的每日一言内容
    function useFallbackQuote() {
        const fallbackQuotes = [
            "生活不是等待风暴过去，而是学会在雨中翩翩起舞。",
            "人生就像一本书，愚蠢的人走马观花，聪明的人细细品读。",
            "成功不是将来才有的，而是从决定去做的那一刻起就已经开始的。",
            "不要等待机会，而要创造机会。",
            "生活中最难的阶段不是没有人懂你，而是你不懂你自己。"
        ];
        
        const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
        dailyQuote.textContent = fallbackQuotes[randomIndex];
    }
    
    // 获取每日一言
    fetchDailyQuote();
    
    // 触摸事件变量
    let startY = 0;
    let currentY = 0;
    let isLocked = true;
    
    // 修改点击解锁功能，点击每日一语区域触发
    swipeHint.addEventListener('click', function(e) {
        if (!isLocked) return;
        
        // 防止点击事件与滑动事件冲突
        if (Math.abs(startY - currentY) > 10) return;
        
        // 动画解锁效果
        animateUnlock();
        
        // 阻止事件冒泡
        e.stopPropagation();
    });
    
    // 更优化的缓动函数
    function easeOutExpo(x) {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    // 添加弹性缓动函数
    function easeOutElastic(x) {
        const c4 = (2 * Math.PI) / 3;
        return x === 0 ? 0 : x === 1 ? 1 :
            Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
    
    // 解锁动画函数 - 没有推拉效果
    function animateUnlock() {
        let progress = 0;
        const animationDuration = 500;
        const startTime = performance.now();
        
        // 获取当前的模糊值作为起点
        const currentFilter = getComputedStyle(lockScreen).filter;
        const currentBlur = currentFilter.includes('blur') ? 
            parseFloat(currentFilter.match(/blur\(([^)]+)\)/)[1]) : 0;
        
        // 获取主内容区域
        const mainContent = document.getElementById('mainContent');
        
        // 初始时主内容区域只是模糊，没有位移
        mainContent.style.filter = 'blur(20px)';
        
        // 立即触发博客元素动画，不等待解锁完成
        triggerBlogElementAnimations();
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            progress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用更平滑的缓动函数
            const easedProgress = easeOutExpo(progress);
            
            // 应用动画效果 - 平滑过渡模糊效果
            lockScreen.style.transform = `translateY(-${easedProgress * 100}%)`;
            
            // 从当前模糊值平滑过渡到最终模糊值
            const blurValue = currentBlur + (40 - currentBlur) * easedProgress;
            lockScreen.style.filter = `blur(${blurValue}px)`;
            
            // 主内容区域从模糊变清晰，但没有位移
            mainContent.style.filter = `blur(${(1 - easedProgress) * 20}px)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成后，应用解锁类
                body.classList.add('unlocked');
                isLocked = false;
                
                // 重置内联样式，使用类来控制
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                mainContent.style.filter = '';
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    // 完成解锁动画 - 添加主内容区域模糊效果的清除
    function completeUnlockAnimation() {
        // 获取当前transform值作为起点
        const currentTransform = getComputedStyle(lockScreen).transform;
        const matrix = new DOMMatrix(currentTransform);
        const currentY = matrix.m42;
        
        // 计算起始位移进度
        let startProgress = Math.abs(currentY) / (window.innerHeight * 0.3);
        startProgress = Math.min(startProgress, 0.8);
        
        // 获取当前的模糊值
        const currentFilter = getComputedStyle(lockScreen).filter;
        const currentBlur = currentFilter.includes('blur') ? 
            parseFloat(currentFilter.match(/blur\(([^)]+)\)/)[1]) : 0;
        
        // 使用更长的动画时间，确保过渡更平滑
        const animationDuration = 400 * (1 - startProgress);
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const animProgress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用平滑的缓动函数
            const easedProgress = easeOutExpo(animProgress);
            
            // 计算当前位移进度
            const transformProgress = startProgress + (1 - startProgress) * easedProgress;
            
            // 应用动画效果 - 平滑过渡模糊效果
            lockScreen.style.transform = `translateY(-${transformProgress * 100}%)`;
            
            // 从当前模糊值平滑过渡到最终模糊值
            const blurValue = currentBlur + (40 - currentBlur) * easedProgress;
            lockScreen.style.filter = `blur(${blurValue}px)`;
            
            // 主内容区域从模糊变清晰
            mainContent.style.filter = `blur(${(1 - easedProgress) * 20}px)`;
            
            if (animProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成后，应用解锁类
                body.classList.add('unlocked');
                isLocked = false;
                
                // 重置内联样式，使用类来控制
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                mainContent.style.filter = '';
                mainContent.style.transform = '';
                
                // 立即触发博客元素动画，不等待解锁完成
                triggerBlogElementAnimations();
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    // 触发博客元素动画 - 修改为从屏幕外飞入
    function triggerBlogElementAnimations() {
        const navbar = document.querySelector('.blog-navbar');
        const posts = document.querySelectorAll('.blog-post');
        const sidebar = document.querySelector('.sidebar');
        const profileCard = document.querySelector('.author-card');
        const categoriesCard = document.querySelector('.categories-card');
        const tagsCard = document.querySelector('.tags-card');
        
        // 触发导航栏动画 - 从上方飞入
        if (navbar) {
            navbar.style.animation = 'slideInDown 0.8s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
        
        // 触发文章卡片动画 - 从下方飞入
        posts.forEach((post, index) => {
            post.style.animation = `fadeInUp 0.8s ${0.1 + index * 0.1}s cubic-bezier(0.23, 1, 0.32, 1) forwards`;
        });
        
        // 触发整个侧边栏动画 - 从右侧飞入
        if (sidebar) {
            sidebar.classList.add('animate');
        }
        
        // 保留现有的单独元素动画以兼容旧代码
        if (profileCard) {
            profileCard.style.animation = 'fadeInRight 0.8s 0.2s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
        
        if (categoriesCard) {
            categoriesCard.style.animation = 'fadeInRight 0.8s 0.4s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
        
        if (tagsCard) {
            tagsCard.style.animation = 'fadeInRight 0.8s 0.6s cubic-bezier(0.23, 1, 0.32, 1) both';
        }
    }
    
    // 在页面加载时，确保元素处于初始位置（屏幕外）
    function resetElementPositions() {
        const navbar = document.querySelector('.blog-navbar');
        const posts = document.querySelectorAll('.blog-post');
        const sidebar = document.querySelector('.sidebar');
        const profileCard = document.querySelector('.profile-card');
        const categoriesCard = document.querySelector('.categories-card');
        const tagsCard = document.querySelector('.tags-card');
        
        if (navbar) {
            navbar.style.transform = 'translateY(-100px)';
            navbar.style.opacity = '0';
        }
        
        posts.forEach(post => {
            post.style.transform = 'translateY(100px)';
            post.style.opacity = '0';
        });
        
        // 重置侧边栏位置
        if (sidebar) {
            sidebar.classList.remove('animate');
            sidebar.style.transform = 'translateX(100px)';
            sidebar.style.opacity = '0';
        }
        
        // 保留现有的单独元素重置
        if (profileCard) {
            profileCard.style.transform = 'translateX(100px)';
            profileCard.style.opacity = '0';
        }
        
        if (categoriesCard) {
            categoriesCard.style.transform = 'translateX(100px)';
            categoriesCard.style.opacity = '0';
        }
        
        if (tagsCard) {
            tagsCard.style.transform = 'translateX(100px)';
            tagsCard.style.opacity = '0';
        }
    }
    
    // 页面加载时重置元素位置
    resetElementPositions();
    
    // 触摸开始
    document.addEventListener('touchstart', function(e) {
        if (!isLocked) return;
        startY = e.touches[0].clientY;
        currentY = startY;
    });
    
    // 触摸移动 - 使用easeOutExpo缓动
    document.addEventListener('touchmove', function(e) {
        if (!isLocked) return;
        
        currentY = e.touches[0].clientY;
        const diffY = startY - currentY;
        
        // 只允许向上滑动
        if (diffY > 0) {
            // 计算锁屏界面的位移，应用缓动曲线
            const rawProgress = Math.min(diffY / 200, 1);
            const progress = easeOutExpo(rawProgress); // 使用easeOutExpo缓动
            
            // 应用窗帘式效果 - 锁屏向上移动
            lockScreen.style.transform = `translateY(-${progress * 30}%)`;
            
            // 将模糊效果应用到整个锁屏界面，而不是背景
            lockScreen.style.filter = `blur(${progress * 40}px)`;
            // 保持背景不模糊，避免双重模糊效果
            blurBg.style.filter = 'blur(0px)';
        }
    });
    
    // 触摸结束 - 重置或完成模糊效果
    document.addEventListener('touchend', function() {
        if (!isLocked) return;
        
        const diffY = startY - currentY;
        
        // 如果滑动距离足够，使用动画函数完成解锁
        if (diffY > 100) {
            // 从当前位置开始动画完成解锁
            completeUnlockAnimation();
        } else {
            // 否则使用动画恢复原位
            resetLockScreenAnimation();
        }
    });
    
    // 重置锁屏动画 - 使用弹性缓动
    function resetLockScreenAnimation() {
        // 获取当前transform值
        const currentTransform = getComputedStyle(lockScreen).transform;
        const matrix = new DOMMatrix(currentTransform);
        const currentY = matrix.m42;
        
        // 计算起始进度
        let startProgress = Math.abs(currentY) / (window.innerHeight * 0.3);
        startProgress = Math.min(startProgress, 1);
        
        // 获取当前的模糊值
        const currentFilter = getComputedStyle(lockScreen).filter;
        const currentBlur = currentFilter.includes('blur') ? 
            parseFloat(currentFilter.match(/blur\(([^)]+)\)/)[1]) : 0;
        
        // 计算起始模糊进度
        const blurStartProgress = currentBlur / 40;
        
        const animationDuration = 300 * startProgress;
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            const animProgress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用弹性缓动函数，添加轻微回弹效果
            const easedProgress = easeOutElastic(animProgress);
            
            // 计算当前进度，从起始进度平滑过渡到0
            const transformProgress = startProgress * (1 - easedProgress);
            const blurProgress = blurStartProgress * (1 - easedProgress);
            
            // 应用动画效果 - 模糊整个锁屏
            lockScreen.style.transform = `translateY(-${transformProgress * 30}%)`;
            lockScreen.style.filter = `blur(${blurProgress * 40}px)`;
            
            if (animProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 重置样式
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                blurBg.style.filter = '';
            }
        }
        
        requestAnimationFrame(animate);
    }

    // 添加返回锁屏按钮引用和事件处理
    const backToLock = document.getElementById('backToLock');
    
    // 添加返回锁屏按钮点击事件
    backToLock.addEventListener('click', function() {
        if (isLocked) return;
        
        // 添加返回动画类
        mainContent.classList.add('returning');
        
        // 使用动画返回锁屏
        backToLockAnimation();
    });
    
    // 添加按钮点击视觉反馈
    backToLock.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });
    
    backToLock.addEventListener('mouseup', function() {
        this.style.transform = '';
    });
    
    // 返回锁屏动画函数 - 移除推拉效果
    function backToLockAnimation() {
        let progress = 0;
        const animationDuration = 550;
        const startTime = performance.now();
        
        // 重置元素位置，准备下一次飞入动画
        resetElementPositions();
        
        // 添加过渡前的准备状态 - 锁屏在屏幕上方，完全清晰
        lockScreen.style.transform = 'translateY(-100%)';
        lockScreen.style.filter = 'blur(0px)'; // 初始状态不模糊
        blurBg.style.filter = 'blur(0px)';
        
        // 强制重绘，确保初始状态被应用
        lockScreen.offsetHeight;
        
        function animate(currentTime) {
            const elapsedTime = currentTime - startTime;
            progress = Math.min(elapsedTime / animationDuration, 1);
            
            // 使用与上滑相同的缓动函数
            const easedProgress = easeOutExpo(progress);
            
            // 应用窗帘下拉式动画效果
            // 锁屏从屏幕上方(-100%)逐渐下拉到原位(0%)
            lockScreen.style.transform = `translateY(-${(1 - easedProgress) * 100}%)`;
            
            // 锁屏模糊效果从0逐渐增加到40px，与上滑相反
            lockScreen.style.filter = `blur(${easedProgress * 40}px)`;
            
            // 主内容区域模糊效果从0逐渐增加到20px
            mainContent.style.filter = `blur(${easedProgress * 20}px)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 动画完成后，移除解锁类
                body.classList.remove('unlocked');
                isLocked = true;
                
                // 重置内联样式，使用类来控制
                lockScreen.style.transform = '';
                lockScreen.style.filter = '';
                mainContent.style.filter = '';
                mainContent.style.transform = '';
                
                // 立即触发博客元素动画，不等待解锁完成
                triggerBlogElementAnimations();
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    // 修复图片显示问题
    const postThumbnails = document.querySelectorAll('.post-thumbnail');
    postThumbnails.forEach(img => {
        // 确保图片路径正确
        if (img.getAttribute('src')) {
            // 检查图片路径是否为相对路径
            const currentSrc = img.getAttribute('src');
            
            // 如果是相对路径且不是以/或./开头，添加./前缀
            if (!currentSrc.startsWith('http') && !currentSrc.startsWith('/') && !currentSrc.startsWith('./')) {
                img.setAttribute('src', './' + currentSrc);
            }
            
            // 如果图片路径包含blog/，尝试修复路径
            if (currentSrc.includes('blog/')) {
                const fixedSrc = currentSrc.replace('blog/', './blog/');
                img.setAttribute('src', fixedSrc);
            }
        }
        
        // 添加错误处理
        img.onerror = function() {
            console.log('图片加载失败:', this.src);
            this.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 500 300%22%3E%3Crect fill%3D%22%23f8f8f8%22 width%3D%22500%22 height%3D%22300%22%2F%3E%3Ctext fill%3D%22%23aaa%22 font-family%3D%22Arial%2C sans-serif%22 font-size%3D%2220%22 x%3D%22250%22 y%3D%22150%22 text-anchor%3D%22middle%22 dominant-baseline%3D%22middle%22%3E图片加载失败%3C%2Ftext%3E%3C%2Fsvg%3E';
            this.classList.add('error');
        };
    });
    
    // 尝试直接设置图片路径
    const firstPostImage = document.querySelector('.blog-post:first-child .post-thumbnail');
    if (firstPostImage) {
        firstPostImage.src = './images/post1.jpg';
    }
    
    const secondPostImage = document.querySelector('.blog-post:nth-child(2) .post-thumbnail');
    if (secondPostImage) {
        secondPostImage.src = './images/post2.jpg';
    }
    
    const thirdPostImage = document.querySelector('.blog-post:nth-child(3) .post-thumbnail');
    if (thirdPostImage) {
        thirdPostImage.src = './images/post3.jpg';
    }

    // 添加定时刷新功能（可选，每小时刷新一次）
    setInterval(fetchDailyQuote, 3600000); // 3600000毫秒 = 1小时

    // 添加到现有JavaScript代码中
    function adjustFullscreenHeight() {
        // 获取真实视口高度
        const vh = window.innerHeight * 0.01;
        // 应用到CSS变量
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // 直接设置锁屏元素高度
        const lockScreen = document.getElementById('lockScreen');
        if (lockScreen) {
            lockScreen.style.height = `${window.innerHeight}px`;
        }
    }

    // 初次加载和调整窗口大小时执行
    window.addEventListener('DOMContentLoaded', adjustFullscreenHeight);
    window.addEventListener('resize', adjustFullscreenHeight);
    window.addEventListener('orientationchange', adjustFullscreenHeight);

    // 处理关于弹窗
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutModal = document.getElementById('closeAboutModal');
    const aboutLinks = document.querySelectorAll('a[href="#about"]'); // 所有链接到#about的<a>元素
    
    // 打开关于弹窗
    function openAboutModal() {
        console.log('打开关于弹窗');
        
        // 先显示模态框但不添加active类
        aboutModal.style.visibility = 'visible';
        
        // 强制重绘以确保初始状态被正确应用
        aboutModal.offsetHeight;
        
        // 添加active类触发动画
        aboutModal.classList.add('active');
        
        // 添加背景模糊
        if (mainContent) {
            mainContent.style.transition = 'filter 0.5s ease';
            mainContent.style.filter = 'blur(5px)';
        }
        
        // 锁定背景滚动
        document.body.style.overflow = 'hidden';
    }
    
    // 关闭关于弹窗
    function closeModal() {
        console.log('关闭关于弹窗');
        
        // 移除active类，开始关闭动画
        aboutModal.classList.remove('active');
        
        // 移除背景模糊
        if (mainContent) {
            mainContent.style.filter = '';
        }
        
        // 等待动画完成后隐藏模态框
        setTimeout(() => {
            aboutModal.style.visibility = 'hidden';
            // 恢复背景滚动
            document.body.style.overflow = '';
        }, 600); // 从400ms改为600ms，与CSS中的动画时长匹配
    }
    
    // 为所有"关于"链接添加点击事件
    aboutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            openAboutModal();
        });
    });
    
    // 关闭按钮事件
    closeAboutModal.addEventListener('click', closeModal);
    
    // 点击模态框背景关闭
    aboutModal.addEventListener('click', function(e) {
        if (e.target === aboutModal) {
            closeModal();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && aboutModal.classList.contains('active')) {
            closeModal();
        }
    });
}); 