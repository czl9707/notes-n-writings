# Compound Pattern in Styling: A Cleaner Approach to Style Propagation

## Compound Component Pattern in Styling

Applying a hover effect to a `Button` is fairly simple, A pure CSS solution is more enough.

``` ts
```

But what if I want to trigger the hover effect when hover on a parent component? Let's say a `Card` component. 

An intuitive solution is straight forward, just let parent component control the hover state.

``` ts
```

The code is a lot, comparing what they actually do. And even worse, both `Card` and `Button` become client components, even if they not really need any client side feature. 

Let's switch back to a pure CSS solution, by passing extrac styles to `Button` component.

``` ts
```

These hover style will be duplicated in multiple place while this use cases increase. Thus, it will be good to extract this out to have it somewhere. Moving the style to a util file is inappropriate, since actually this is not a util can be used everywhere, it is always used in context of `Button`. 

It is indeed fit into compound component pattern, we can provide a component `HoverContext` for consumer to opt-in the extra hover behavior of the button.

``` ts
```

To reduce overhead of another layer of `div`, we can simplify this by just exposing the className.

``` ts
```

