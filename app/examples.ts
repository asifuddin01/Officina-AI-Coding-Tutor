/**
 * Programs to start from. Each is small enough to step through by hand and
 * shows one thing a trace makes visible that output alone does not.
 */
export interface Example {
  title: string;
  note: string;
  code: string;
  stdin?: string;
}

export const EXAMPLES: Example[] = [
  {
    title: 'Palindrome check',
    note: 'Two indices walk inward; each comparison and its values are recorded.',
    code: `s = "madam"
ok = True
for i in range(len(s) // 2):
    if s[i] != s[len(s) - 1 - i]:
        ok = False
        break
print("palindrome" if ok else "not a palindrome")
`,
  },
  {
    title: 'Star palindrome',
    note: 'The guide’s own example: only *, never longer than 6.',
    code: `n = 6
for width in list(range(1, n + 1)) + list(range(n - 1, 0, -1)):
    print("*" * width)
`,
  },
  {
    title: 'Factorial, recursively',
    note: 'Watch the call stack grow to the base case and unwind with each return.',
    code: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(5))
`,
  },
  {
    title: 'Bubble sort',
    note: 'A list mutated in place: the changed positions are named at each swap.',
    code: `def bubble(xs):
    n = len(xs)
    for i in range(n):
        for j in range(n - 1 - i):
            if xs[j] > xs[j + 1]:
                xs[j], xs[j + 1] = xs[j + 1], xs[j]
    return xs

data = [5, 1, 4, 2, 8]
bubble(data)
print(data)
`,
  },
  {
    title: 'Binary search',
    note: 'lo, mid and hi close in on the target; the while test is shown each pass.',
    code: `def search(xs, target):
    lo, hi = 0, len(xs) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if xs[mid] == target:
            return mid
        elif xs[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(search([2, 3, 5, 7, 11, 13, 17], 11))
`,
  },
  {
    title: 'A linked list',
    note: 'Objects and the references between them.',
    code: `class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

head = None
for v in [3, 2, 1]:
    head = Node(v, head)

node = head
while node:
    print(node.value)
    node = node.next
`,
  },
  {
    title: 'Reading input',
    note: 'input() reads from the Input box; what it read is part of the trace.',
    code: `name = input("Your name? ")
times = int(input("How many times? "))
for _ in range(times):
    print("Hello,", name)
`,
    stdin: 'Ada\n2\n',
  },
  {
    title: 'A runtime error',
    note: 'The trace stops where the exception was raised and shows it unwinding.',
    code: `def average(xs):
    return sum(xs) / len(xs)

print(average([4, 8]))
print(average([]))
print("never printed")
`,
  },
  {
    title: 'A loop that never ends',
    note: 'The tracer stops it at the step limit and keeps what it saw.',
    code: `n = 0
while True:
    n += 1
`,
  },
];
