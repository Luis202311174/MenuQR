import re, pathlib
path=pathlib.Path(r'd:\\Reggie Files\\MenuQR-main\\src\\app\\signup-owner\\page.jsx')
text=path.read_text()
# naive counter
brace=0
paren=0
errors=[]
for i,ch in enumerate(text, start=1):
    if ch=='{': brace+=1
    elif ch=='}': brace-=1
    if ch=='(': paren+=1
    elif ch==')': paren-=1
    if brace<0 or paren<0:
        errors.append((i, ch, brace, paren))
print('final counts', brace, paren)
print('errors', errors[:5])
# show last 100 chars around potential issue
print(text[-100:])
